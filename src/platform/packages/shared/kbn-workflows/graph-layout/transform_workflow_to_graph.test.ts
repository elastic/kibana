/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeTopologyFingerprint } from './compute_topology_fingerprint';
import { transformWorkflowToGraph } from './transform_workflow_to_graph';
import type { WorkflowYaml } from '../spec/schema';

const minimal = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [],
    ...overrides,
  } as unknown as WorkflowYaml);

describe('transformWorkflowToGraph', () => {
  it('returns empty graph for undefined workflow', () => {
    const r = transformWorkflowToGraph(undefined);
    expect(r.nodes).toEqual([]);
    expect(r.edges).toEqual([]);
    expect(r.foreachGroups).toEqual([]);
  });

  it('connects all triggers to the first step', () => {
    const r = transformWorkflowToGraph(
      minimal({
        triggers: [
          { type: 'manual', enabled: true },
          { type: 'scheduled', enabled: true, with: { every: '1h' } },
        ] as unknown as WorkflowYaml['triggers'],
        steps: [
          { name: 'first', type: 'http', with: { url: 'x' } },
          { name: 'second', type: 'http', with: { url: 'y' } },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const triggerEdges = r.edges.filter((e) => e.target === 'first');
    expect(triggerEdges).toHaveLength(2);
    // sequential
    expect(r.edges).toContainEqual(expect.objectContaining({ source: 'first', target: 'second' }));
  });

  it('labels if-branch edges as true / false', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x > 1',
            steps: [{ name: 'thenStep', type: 'http' }],
            else: [{ name: 'elseStep', type: 'http' }],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const labels = r.edges
      .filter((e) => e.source === 'gate')
      .map((e) => e.label)
      .sort();
    expect(labels).toEqual(['false', 'true']);
  });

  it('promotes top-level foreach to a group container', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            foreach: 'items',
            steps: [{ name: 'inner', type: 'http' }],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    expect(r.foreachGroups).toHaveLength(1);
    expect(r.foreachGroups[0].id).toBe('loop');
    // edge from foreach to first inner step is labelled 'for each item'
    const entry = r.edges.find((e) => e.source === 'loop');
    expect(entry?.label).toBe('for each item');
  });

  it('connects branch leaves to the step that follows an if', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x > 1',
            steps: [
              { name: 't1', type: 'http' },
              { name: 't2', type: 'http' },
            ],
            else: [
              { name: 'e1', type: 'http' },
              { name: 'e2', type: 'http' },
            ],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    expect(sourcesIntoAfter).toEqual(['e2', 't2']);
  });

  it('falls through the if step when only one branch is present', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x > 1',
            steps: [{ name: 't1', type: 'http' }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    // The true path joins from t1; the false path bypasses via gate itself.
    expect(sourcesIntoAfter).toEqual(['gate', 't1']);
  });

  it('produces unique ids for duplicate step names via slug allocator', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          { name: 'Notify', type: 'http' },
          { name: 'Notify', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const ids = r.nodes.filter((n) => n.type === 'step').map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('computeTopologyFingerprint', () => {
  const wfA = minimal({
    steps: [{ name: 'a', type: 'http' }] as unknown as WorkflowYaml['steps'],
  });

  it('changes when a step is renamed', () => {
    const wfB = minimal({
      steps: [{ name: 'aa', type: 'http' }] as unknown as WorkflowYaml['steps'],
    });
    expect(computeTopologyFingerprint(wfA)).not.toEqual(computeTopologyFingerprint(wfB));
  });

  it('does not change when only step params change', () => {
    const wfB = minimal({
      steps: [{ name: 'a', type: 'http', with: { url: 'x' } }] as unknown as WorkflowYaml['steps'],
    });
    expect(computeTopologyFingerprint(wfA)).toEqual(computeTopologyFingerprint(wfB));
  });
});
