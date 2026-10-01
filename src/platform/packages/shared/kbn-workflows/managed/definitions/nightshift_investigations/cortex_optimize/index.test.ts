/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_CORTEX_OPTIMIZE_WORKFLOW, NIGHTSHIFT_CORTEX_OPTIMIZE_WORKFLOW_ID } from '.';

const workflow = parse(NIGHTSHIFT_CORTEX_OPTIMIZE_WORKFLOW.yaml) as {
  name: string;
  triggers: Array<{
    inputs: { properties: Record<string, { type: string; maxLength?: number }> };
  }>;
  steps: Array<{ name: string; type?: string; with?: Record<string, unknown> }>;
};

describe('cortex optimize workflow', () => {
  it('is a post-round workflow that updates the wiki from the transcript', () => {
    expect(NIGHTSHIFT_CORTEX_OPTIMIZE_WORKFLOW.id).toBe(NIGHTSHIFT_CORTEX_OPTIMIZE_WORKFLOW_ID);
    expect(workflow.name).toBe('Cortex Optimize');
    expect(workflow.steps).toEqual([
      expect.objectContaining({
        name: 'optimize_cortex',
        type: 'nightshift.cortexOptimize',
      }),
    ]);
  });

  it('forwards strict and round model inputs to the optimizer', () => {
    expect(workflow.triggers[0].inputs.properties).toEqual(
      expect.objectContaining({
        connector_id: expect.objectContaining({ type: 'string', maxLength: 500 }),
        round_connector_id: expect.objectContaining({ type: 'string', maxLength: 500 }),
      })
    );
    expect(workflow.steps[0].with).toEqual(
      expect.objectContaining({
        connector_id: '{{ inputs.connector_id }}',
        round_connector_id: '{{ inputs.round_connector_id }}',
      })
    );
  });

  // Liquid `{{ }}` would stringify the arrays, leaving the optimizer without tool output.
  it('hands round tool calls and results to the optimizer as arrays', () => {
    expect(workflow.steps[0].with?.tool_calls).toBe('${{ inputs.tool_calls }}');
    expect(workflow.steps[0].with?.tool_results).toBe('${{ inputs.tool_results }}');
  });
});
