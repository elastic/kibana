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

const minimal = (steps: unknown[]): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps,
  } as unknown as WorkflowYaml);

const runLayout = (steps: unknown[], direction: 'TB' | 'LR' = 'TB') => {
  const transformed = transformWorkflowToGraph(minimal(steps));
  return computeWorkflowLayout(transformed, { direction });
};

const xOf = (nodes: { id: string; x: number }[], id: string) => {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Expected node "${id}"`);
  return n.x;
};

const yOf = (nodes: { id: string; y: number }[], id: string) => {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Expected node "${id}"`);
  return n.y;
};

describe('computeWorkflowLayout — fork lane order', () => {
  it('TB: keeps true left of false when else grows to multiple steps', () => {
    const { nodes } = runLayout([
      {
        name: 'gate',
        type: 'if',
        condition: 'x',
        steps: [
          { name: 'yes1', type: 'console' },
          { name: 'yes2', type: 'console' },
          { name: 'yes3', type: 'console' },
        ],
        else: [
          { name: 'no1', type: 'console' },
          { name: 'no2', type: 'console' },
        ],
      },
    ]);
    expect(xOf(nodes, 'yes1')).toBeLessThan(xOf(nodes, 'no1'));
  });

  it('TB: keeps true < false < error when all three lanes exist', () => {
    const { nodes } = runLayout([
      {
        name: 'gate',
        type: 'if',
        condition: 'x',
        steps: [
          { name: 'yes1', type: 'console' },
          { name: 'yes2', type: 'console' },
        ],
        else: [
          { name: 'no1', type: 'console' },
          { name: 'no2', type: 'console' },
        ],
        'on-failure': { fallback: [{ name: 'err', type: 'console' }] },
      },
    ]);
    expect(xOf(nodes, 'yes1')).toBeLessThan(xOf(nodes, 'no1'));
    expect(xOf(nodes, 'no1')).toBeLessThan(xOf(nodes, 'err'));
  });

  it('LR: keeps true above false when else grows to multiple steps', () => {
    const { nodes } = runLayout(
      [
        {
          name: 'gate',
          type: 'if',
          condition: 'x',
          steps: [
            { name: 'yes1', type: 'console' },
            { name: 'yes2', type: 'console' },
          ],
          else: [
            { name: 'no1', type: 'console' },
            { name: 'no2', type: 'console' },
          ],
        },
      ],
      'LR'
    );
    expect(yOf(nodes, 'yes1')).toBeLessThan(yOf(nodes, 'no1'));
  });

  it('TB foreach body: keeps true left of false for nested if branches', () => {
    const { nodes } = runLayout([
      {
        name: 'loop',
        type: 'foreach',
        foreach: 'items',
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x',
            steps: [{ name: 'yes', type: 'console' }],
            else: [{ name: 'no', type: 'console' }],
          },
        ],
      },
    ]);
    expect(xOf(nodes, 'yes')).toBeLessThan(xOf(nodes, 'no'));
  });
});
