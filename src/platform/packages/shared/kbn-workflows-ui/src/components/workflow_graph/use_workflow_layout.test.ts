/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { WorkflowYaml } from '@kbn/workflows';
import { useWorkflowLayout } from './use_workflow_layout';

const minimal = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [],
    ...overrides,
  } as unknown as WorkflowYaml);

describe('useWorkflowLayout', () => {
  it('includes foreach inner nodes and edges', () => {
    const workflow = minimal({
      steps: [
        {
          name: 'loop',
          type: 'foreach',
          foreach: 'items',
          steps: [
            { name: 'inner_a', type: 'http' },
            { name: 'inner_b', type: 'http' },
          ],
        },
      ] as unknown as WorkflowYaml['steps'],
    });

    const { result } = renderHook(() => useWorkflowLayout({ workflow }));

    const nodeIds = result.current.nodes.map((n) => n.id);
    expect(nodeIds).toEqual(expect.arrayContaining(['loop', 'inner-a', 'inner-b']));

    const innerA = result.current.nodes.find((n) => n.id === 'inner-a');
    const innerB = result.current.nodes.find((n) => n.id === 'inner-b');
    expect(innerA?.parentId).toBe('loop');
    expect(innerB?.parentId).toBe('loop');

    const edgeIds = result.current.edges.map((e) => e.id);
    expect(edgeIds).toEqual(expect.arrayContaining(['inner-a:inner-b']));
  });
});
