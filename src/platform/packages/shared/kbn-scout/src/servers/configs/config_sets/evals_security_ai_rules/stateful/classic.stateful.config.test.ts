/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import yaml from 'js-yaml';
import { servers as evalsSecurityAiRules } from './classic.stateful.config';
import { servers as evalsSecurityAll } from '../../evals_security_all/stateful/classic.stateful.config';
import { servers as evalsTracing } from '../../evals_tracing/stateful/classic.stateful.config';

const WEEKLY_PIPELINE_PATH = path.join(REPO_ROOT, '.buildkite/pipelines/evals/llm_evals.yml');

interface PipelineStep {
  label?: string;
  key?: string;
  env?: Record<string, string>;
  steps?: PipelineStep[];
}

const getServerArgs = (config: { kbnTestServer: { serverArgs: string[] } }): string[] =>
  config.kbnTestServer.serverArgs;

const getExperimentalFlags = (serverArgs: string[]): string[] => {
  const prefix = '--xpack.securitySolution.enableExperimental=';
  const arg = serverArgs.find((serverArg) => serverArg.startsWith(prefix));
  if (!arg) {
    return [];
  }
  return JSON.parse(arg.slice(prefix.length)) as string[];
};

const findStep = (steps: PipelineStep[], key: string): PipelineStep | undefined => {
  for (const step of steps) {
    if (step.key === key) {
      return step;
    }
    const nested = step.steps ? findStep(step.steps, key) : undefined;
    if (nested) {
      return nested;
    }
  }
  return undefined;
};

// Config sets a weekly security eval step may boot with, keyed by the value the pipeline passes.
const WEEKLY_CONFIG_SETS: Record<string, string[]> = {
  evals_tracing: getServerArgs(evalsTracing),
  evals_security_ai_rules: getServerArgs(evalsSecurityAiRules),
  evals_security_all: getServerArgs(evalsSecurityAll),
};

// Weekly steps whose suites exercise the security Agent Builder skills through
// `register_skills.ts` (find-rules, recommend-prebuilt-rules, investigate-rule). A step booted
// with a config set that does not enable `dexAiSkillFindRules` runs those specs against a Kibana
// where find-security-rules is never registered, so they fail on every model.
const SKILL_DEPENDENT_WEEKLY_STEPS = [
  'kbn-evals-weekly-agent-builder',
  'kbn-evals-weekly-security-multi-step',
];

describe('evals_security_ai_rules config set', () => {
  it('registers the security Agent Builder skills the agent-builder specs assert', () => {
    expect(getExperimentalFlags(getServerArgs(evalsSecurityAiRules))).toEqual(
      expect.arrayContaining([
        'dexAiSkillFindRules',
        'dexAiSkillRecommendPrebuiltRules',
        'investigateRuleSkill',
      ])
    );
  });
});

describe('weekly eval pipeline config sets', () => {
  const pipeline = yaml.load(fs.readFileSync(WEEKLY_PIPELINE_PATH, 'utf8')) as {
    steps: PipelineStep[];
  };

  it.each(SKILL_DEPENDENT_WEEKLY_STEPS)(
    'boots %s with a config set that registers find-security-rules',
    (stepKey) => {
      const step = findStep(pipeline.steps, stepKey);
      expect(step).toBeDefined();

      const configSetId = step?.env?.EVAL_SERVER_CONFIG_SET;
      expect(configSetId).toBeDefined();

      const serverArgs = WEEKLY_CONFIG_SETS[configSetId as string];
      expect(serverArgs).toBeDefined();

      expect(getExperimentalFlags(serverArgs)).toContain('dexAiSkillFindRules');
    }
  );
});
