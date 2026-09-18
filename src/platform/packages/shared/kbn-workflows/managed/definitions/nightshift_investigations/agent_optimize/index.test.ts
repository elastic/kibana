/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW, NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '.';

const workflow = parse(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.yaml) as {
  name: string;
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
  it('obtains one sandbox then optimizes cortex and memory in parallel with that id', () => {
    expect(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW.id).toBe(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID);
    expect(workflow.name).toBe('Nightshift Agent Optimize');
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
                }),
              }),
            ],
          }),
        ],
      }),
    ]);
  });
});
