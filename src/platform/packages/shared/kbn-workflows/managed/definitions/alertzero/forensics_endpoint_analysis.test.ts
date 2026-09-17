/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW,
} from '.';
import FORENSICS_ENDPOINT_ANALYSIS_YAML from './forensics_endpoint_analysis.yaml';
import { renderScheduledWorkerYaml } from './worker_template_values';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
}

const yaml = renderScheduledWorkerYaml(FORENSICS_ENDPOINT_ANALYSIS_YAML, {
  settingsVersion: 1,
  autonomyLevel: 'manual',
  scheduleInterval: '15m',
});
const definition = parse(yaml) as {
  tags?: string[];
  triggers?: Array<{ type: string }>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

const startRun = flatten(definition.steps).find((step) => step.name === 'start_run');

describe('Endpoint analysis worker (sweep)', () => {
  it('stays a Watch-tagged worker that owns the per-space schedule', () => {
    expect(ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW.id).toBe(
      'system-security-forensics-endpoint-analysis'
    );
    expect(definition.tags).toEqual(expect.arrayContaining(['watch', 'watch-forensics']));
    expect(definition.triggers?.map(({ type }) => type)).toEqual(['scheduled', 'manual']);
  });

  it('dispatches the global analysis run and does not write indicators', () => {
    expect(startRun?.type).toBe('workflow.executeAsync');
    expect(startRun?.with?.['workflow-id']).toBe(
      ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW_ID
    );
    expect(flatten(definition.steps).some((step) => step.type === 'context-engine.updateKi')).toBe(
      false
    );
    expect(flatten(definition.steps).some((step) => step.type === 'context-engine.createKi')).toBe(
      false
    );
  });

  it('starts at most one analysis when none are in flight', () => {
    const search = flatten(definition.steps).find(
      (step) => step.name === 'search_pending_indicators'
    );
    expect(search?.with?.size).toBe(1);
    expect(yaml).toContain('max_open_checks: 1');
    expect(yaml).toContain('batch_size: 1');
    const query = JSON.stringify(search?.with);
    expect(query).toContain('security.analyze_endpoint');
    expect(query).toContain('attributes.status');
    expect(query).toContain('attributes.space_id');
  });
});
