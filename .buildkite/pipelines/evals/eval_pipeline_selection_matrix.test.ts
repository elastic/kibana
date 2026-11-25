/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEvalPipeline, getEvalTriggerStep } from './eval_pipeline.ts';

jest.mock('fs', () => ({ readFileSync: jest.fn() }));
jest.mock('child_process', () => ({ execFileSync: jest.fn() }));

const { readFileSync } = jest.requireMock('fs') as { readFileSync: jest.Mock };
const { execFileSync } = jest.requireMock('child_process') as { execFileSync: jest.Mock };

const SUITES = {
  suites: [
    {
      id: 'agent-builder',
      name: 'Agent Builder',
      ciLabels: ['evals:agent-builder'],
      configPath: 'x-pack/agent-builder/playwright.config.ts',
    },
    {
      id: 'smoke-tests',
      name: 'Smoke Tests',
      ciLabels: ['evals:smoke-tests'],
      configPath: 'x-pack/smoke-tests/playwright.config.ts',
      defaultModelGroups: ['eis/anthropic-claude-4.5-haiku'],
    },
    {
      id: 'weekly',
      name: 'Weekly',
      configPath: 'x-pack/weekly/playwright.config.ts',
      weeklyEisModelGroups: ['eis/openai-gpt-5.4'],
      defaultModelGroups: [],
    },
  ],
};

// Pins the output of the label-driven selection (suites, models, judge) so that sharing its
// per-suite logic with the PR suggester cannot silently change what CI runs.
const LABEL_SETS = [
  '',
  'unrelated,ci:foo',
  'evals:agent-builder',
  'evals:agent-builder,models:eis/openai-gpt-5.4',
  'evals:agent-builder,models:eis/openai-gpt-5.4,models:eis/google-gemini-3.1-pro',
  'evals:agent-builder,models:judge:eis/anthropic-claude-4.6-opus',
  'evals:agent-builder,models:eis/openai-gpt-5.4,models:judge:openrouter/openai-gpt-5.4',
  'evals:smoke-tests',
  'evals:smoke-tests,evals:skip-smoke-tests',
  'evals:smoke-tests,models:eis/openai-gpt-5.4',
  'evals:all',
  'evals:all,models:eis/openai-gpt-5.4',
  'evals:all,models:eis/openai-gpt-5.4,evals:skip-agent-builder,evals:skip-weekly',
  'evals:all,models:judge:eis/anthropic-claude-4.6-opus',
  'evals:weekly,models:weekly-eis-models',
  'evals:agent-builder,models:weekly-eis-models',
  'models:eis/openai-gpt-5.4',
  'evals:skip-agent-builder',
  '["evals:agent-builder","models:eis/openai-gpt-5.4"]',
];

describe('eval selection label matrix', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.EVAL_PREEMPTIBLE;
    readFileSync.mockReturnValue(JSON.stringify(SUITES));
    execFileSync.mockImplementation((_cmd: string, args: string[]) => args[args.length - 1]);
  });

  it.each(LABEL_SETS)('keeps the pipeline and trigger step stable for labels %j', (labels) => {
    expect({
      pipeline: getEvalPipeline(labels),
      trigger: getEvalTriggerStep(labels),
    }).toMatchSnapshot();
  });
});
