/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW } from '.';

interface WorkflowStep {
  name: string;
  'on-failure'?: { continue?: boolean };
  with?: { path?: string };
  steps?: WorkflowStep[];
}

interface ParsedWorkflow {
  steps: WorkflowStep[];
}

const workflow = parse(
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW.yaml
) as ParsedWorkflow;

const stepNames = workflow.steps.map((step) => step.name);

describe('KI features identification workflow', () => {
  it('catalogues metric definitions after inferred features and continues when that step fails', () => {
    const metricStep = workflow.steps.find((step) => step.name === 'identify_metric_definitions');

    expect(stepNames.indexOf('identify_metric_definitions')).toBeGreaterThan(
      stepNames.indexOf('check_all_failed')
    );
    expect(stepNames.indexOf('output_result')).toBeGreaterThan(
      stepNames.indexOf('identify_metric_definitions')
    );
    expect(metricStep?.['on-failure']?.continue).toBe(true);
    expect(metricStep?.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/streams/{{ inputs.sourceId }}/features/_identify/metric_definitions'
    );

    const output = workflow.steps.find((step) => step.name === 'output_result');
    expect(output?.with).toEqual(
      expect.objectContaining({
        metricDefinitionsCount:
          '${{ steps.identify_metric_definitions.output.metricDefinitionsCount }}',
      })
    );
  });
});
