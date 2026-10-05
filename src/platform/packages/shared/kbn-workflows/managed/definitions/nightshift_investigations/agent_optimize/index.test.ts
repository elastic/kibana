/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW, NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '.';

const workflow = parse(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.yaml) as {
  name: string;
  description: string;
  triggers: Array<{
    inputs: { properties: Record<string, unknown>; additionalProperties?: boolean };
  }>;
  steps: Array<{
    name: string;
    type?: string;
    if?: string;
    mode?: string;
    with?: Record<string, unknown>;
    branches?: Array<{
      name: string;
      steps: Array<{ name: string; type?: string; with?: Record<string, string> }>;
    }>;
  }>;
};

describe('nightshift agent optimize workflow', () => {
  // The schema is strict, so any after-execution input Agent Builder sends must be declared here.
  it('declares every input the after-execution hook sends', () => {
    const [{ inputs }] = workflow.triggers;
    expect(inputs.additionalProperties).toBe(false);
    expect(Object.keys(inputs.properties).sort()).toEqual(
      [
        'agent_id',
        'connector_id',
        'conversation_id',
        'prompt',
        'response',
        'round_connector_id',
        'round_id',
        'tool_calls',
        'tool_results',
        'workflow_context',
      ].sort()
    );
  });

  it('bounds the strict and round model inputs', () => {
    const { properties } = workflow.triggers[0].inputs;
    expect(properties.connector_id).toEqual(expect.objectContaining({ maxLength: 500 }));
    expect(properties.round_connector_id).toEqual(expect.objectContaining({ maxLength: 500 }));
  });

  it('obtains one sandbox then optimizes cortex and memory in parallel with that id', () => {
    expect(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.id).toBe(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID);
    expect(workflow.name).toBe('Nightshift Agent Optimize');
    expect(workflow.description).toContain(
      'Authorization to execute this managed workflow permits its defined Memory operations'
    );
    expect(workflow.description).toContain('trusted current-Space execution context');
    expect(workflow.steps).toEqual([
      expect.objectContaining({
        name: 'obtain_sandbox',
        type: 'nightshift.obtainSandbox',
        if: '${{ inputs.conversation_id != null }}',
        with: expect.objectContaining({
          conversation_id: '{{ inputs.conversation_id }}',
          required: false,
        }),
      }),
      expect.objectContaining({
        name: 'optimize_workspaces',
        type: 'parallel',
        mode: 'settled',
        branches: [
          expect.objectContaining({
            name: 'cortex',
            steps: [
              expect.objectContaining({
                name: 'optimize_cortex',
                type: 'nightshift.cortexOptimize',
                with: expect.objectContaining({
                  sandbox_id: '{{ steps.obtain_sandbox.output.sandbox_id }}',
                  connector_id: '{{ inputs.connector_id }}',
                  round_connector_id: '{{ inputs.round_connector_id }}',
                  conversation_id: '{{ inputs.conversation_id }}',
                  round_id: '{{ inputs.round_id }}',
                  // Liquid `{{ }}` would stringify the array, leaving the optimizer with no tool calls to read.
                  tool_calls: '${{ inputs.tool_calls }}',
                  tool_results: '${{ inputs.tool_results }}',
                }),
              }),
            ],
          }),
          expect.objectContaining({
            name: 'memory',
            steps: [
              expect.objectContaining({
                name: 'optimize_memory',
                type: 'nightshift.memoryOptimize',
                with: expect.objectContaining({
                  sandbox_id: '{{ steps.obtain_sandbox.output.sandbox_id }}',
                  connector_id: '{{ inputs.connector_id }}',
                  round_connector_id: '{{ inputs.round_connector_id }}',
                  conversation_id: '{{ inputs.conversation_id }}',
                  round_id: '{{ inputs.round_id }}',
                  recalled_ids:
                    '${{ inputs.workflow_context["nightshift.semantic_memory.recall"].data.recalled_ids }}',
                  tool_calls: '${{ inputs.tool_calls }}',
                  tool_results: '${{ inputs.tool_results }}',
                }),
              }),
            ],
          }),
        ],
      }),
    ]);
  });
});
