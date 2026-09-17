/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW } from '.';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import { renderCommonWorkerYaml } from './worker_template_values';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
  if?: string;
}

const yaml = renderCommonWorkerYaml(FORENSICS_ENDPOINT_ANALYSIS_YAML, {
  settingsVersion: 1,
  autonomyLevel: 'manual',
});
const definition = parse(yaml) as {
  tags?: string[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
  triggers?: Array<{
    type: string;
    inputs?: { required?: string[] };
  }>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? []), ...flatten(step.else ?? [])]);

const allSteps = flatten(definition.steps);
const stepByName = (name: string) => allSteps.find((step) => step.name === name);

describe('Endpoint analysis worker (run)', () => {
  it('is the Watch-tagged forensic pass with a manual trigger', () => {
    expect(ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW.id).toBe(
      'system-security-forensics-endpoint-analysis'
    );
    expect(definition.tags).toEqual(expect.arrayContaining(['watch', 'watch-forensics']));
    expect(definition.triggers?.map(({ type }) => type)).toEqual(['manual']);
  });

  it('requires ki_id and ai_index_id only', () => {
    expect(definition.triggers?.[0]?.inputs?.required).toEqual(['ki_id', 'ai_index_id']);
  });

  it('allows two analyses in the same space', () => {
    expect(definition.settings?.concurrency).toEqual({
      key: 'endpoint-analysis',
      strategy: 'drop',
      max: 2,
    });
  });

  it('reads the indicator before any forensic step', () => {
    expect(definition.steps[0]?.name).toBe('read_ki');
    expect(stepByName('fetch_attack_discovery_alert')).toBeDefined();
    expect(definition.steps.findIndex((s) => s.name === 'read_ki')).toBeLessThan(
      definition.steps.findIndex((s) => s.name === 'when_ki_valid')
    );
  });

  it('marks the indicator processed only after a valid request', () => {
    const mark = stepByName('mark_processed');
    expect(mark?.type).toBe('context-engine.updateKi');
    expect(mark?.if).toContain('attack_discovery_alert_id');
    expect(mark?.if).toContain('investigation_id');
    expect(mark?.with).toEqual(
      expect.objectContaining({
        ai_index_id: '{{ inputs.ai_index_id }}',
        ki_id: '{{ inputs.ki_id }}',
      })
    );
  });
});
