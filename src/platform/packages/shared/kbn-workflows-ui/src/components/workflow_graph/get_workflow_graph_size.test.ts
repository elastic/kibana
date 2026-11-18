/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { getWorkflowGraphSize } from './get_workflow_graph_size';

const workflow = (steps: Array<{ name: string; type: string }>): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps,
  } as unknown as WorkflowYaml);

const chain = workflow([
  { name: 'first', type: 'console' },
  { name: 'second', type: 'console' },
  { name: 'third', type: 'console' },
]);

describe('getWorkflowGraphSize', () => {
  it('measures a chain as tall when vertical and wide when horizontal', () => {
    const vertical = getWorkflowGraphSize(chain, 'TB');
    const horizontal = getWorkflowGraphSize(chain, 'LR');

    expect(vertical?.height).toBeGreaterThan(vertical?.width ?? Infinity);
    expect(horizontal?.width).toBeGreaterThan(horizontal?.height ?? Infinity);
  });

  it('grows along the flow with each step', () => {
    const shorter = getWorkflowGraphSize(workflow([{ name: 'only', type: 'console' }]), 'TB');

    expect(getWorkflowGraphSize(chain, 'TB')?.height).toBeGreaterThan(shorter?.height ?? Infinity);
  });
});
