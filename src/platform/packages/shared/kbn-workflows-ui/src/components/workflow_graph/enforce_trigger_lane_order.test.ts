/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import { computeWorkflowLayout } from './workflow_layout_pipeline';

const withTriggers = (triggers: unknown[]): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers,
    steps: [{ name: 'first', type: 'console' }],
  } as unknown as WorkflowYaml);

const runLayout = (triggers: unknown[], direction: 'TB' | 'LR' = 'TB') => {
  const transformed = transformWorkflowToGraph(withTriggers(triggers));
  const { nodes } = computeWorkflowLayout(transformed, { direction });
  const triggerIds = transformed.nodes.filter((n) => n.type === 'trigger').map((n) => n.id);
  return { nodes, triggerIds };
};

const crossOf = (
  nodes: { id: string; x: number; y: number }[],
  id: string,
  direction: 'TB' | 'LR'
) => {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Expected node "${id}"`);
  return direction === 'LR' ? n.y : n.x;
};

describe('computeWorkflowLayout — trigger lane order', () => {
  it('TB: keeps declaration order left → right (appended trigger on the right)', () => {
    const { nodes, triggerIds } = runLayout(
      [{ type: 'alert' }, { type: 'manual' }, { type: 'scheduled' }],
      'TB'
    );
    expect(triggerIds).toHaveLength(3);
    const xs = triggerIds.map((id) => crossOf(nodes, id, 'TB'));
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  it('LR: keeps declaration order top → bottom (appended trigger on the bottom)', () => {
    const { nodes, triggerIds } = runLayout([{ type: 'alert' }, { type: 'manual' }], 'LR');
    expect(triggerIds).toHaveLength(2);
    const ys = triggerIds.map((id) => crossOf(nodes, id, 'LR'));
    expect(ys[0]).toBeLessThan(ys[1]);
  });
});
