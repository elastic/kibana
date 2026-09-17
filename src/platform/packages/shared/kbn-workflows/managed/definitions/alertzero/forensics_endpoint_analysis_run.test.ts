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
  ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW,
  ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from '.';

interface YamlStep {
  name: string;
  type: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
}

const definition = parse(ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW.yaml) as {
  name?: string;
  tags?: string[];
  settings?: { concurrency?: { key?: string; strategy?: string; max?: number } };
  triggers?: Array<{ type: string; with?: { every?: string } }>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

const startRun = flatten(definition.steps).find((step) => step.name === 'start_run');

describe('Endpoint analysis sweep', () => {
  it('is the untagged global dispatcher on a one-minute schedule', () => {
    expect(ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW.id).toBe(
      ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW_ID
    );
    expect(definition.name).toBe('Endpoint analysis sweep');
    expect(definition.tags).toEqual(['security', 'endpoint-analysis']);
    expect(definition.tags).not.toContain('watch');
    expect(definition.triggers?.map(({ type }) => type)).toEqual(['scheduled', 'manual']);
    expect(definition.triggers?.[0]?.with?.every).toBe('1m');
  });

  it('starts the space-suffixed Watch worker and does not write indicators', () => {
    expect(startRun?.type).toBe('kibana.request');
    expect(String(startRun?.with?.path)).toContain(
      `${ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID}-`
    );
    expect(flatten(definition.steps).some((step) => step.type === 'context-engine.updateKi')).toBe(
      false
    );
    expect(flatten(definition.steps).some((step) => step.type === 'context-engine.createKi')).toBe(
      false
    );
  });

  it('starts up to two analyses per sweep', () => {
    const search = flatten(definition.steps).find(
      (step) => step.name === 'search_pending_indicators'
    );
    expect(search?.with?.size).toBe(2);
    expect(ALERTZERO_FORENSICS_ENDPOINT_ANALYSIS_RUN_WORKFLOW.yaml).toContain('batch_size: 2');
    const query = JSON.stringify(search?.with);
    expect(query).toContain('security.analyze_endpoint');
    expect(query).toContain('attributes.status');
    expect(query).toContain('attributes.space_id');
  });
});
