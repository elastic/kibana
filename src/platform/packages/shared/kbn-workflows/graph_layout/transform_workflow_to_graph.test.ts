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
    // The foreach group is a self-contained folder: inner nodes are in the group,
    // not connected to the outer graph. There is no edge from the group node to
    // its inner steps in the outer edge list.
    const outerEdgesFromLoop = r.edges.filter((e) => e.source === 'loop');
    expect(outerEdgesFromLoop).toHaveLength(0);
    // The inner step lives in the group's innerNodes, not in the top-level nodes.
    expect(r.foreachGroups[0].innerNodes).toHaveLength(1);
    expect(r.foreachGroups[0].innerNodes[0].data.label).toBe('inner');
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

  it('renders a placeholder lane for the missing else when only the then branch is present', () => {
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

    // A synthetic placeholder node should exist for the missing else lane.
    const placeholder = r.nodes.find((n) => n.type === 'placeholder');
    expect(placeholder).toBeDefined();
    expect((placeholder?.data as { branch?: string })?.branch).toBe('else');

    // Gate fans out to both the then-branch (t1) and the placeholder via bus edges.
    expect(r.edges).toContainEqual(
      expect.objectContaining({ source: 'gate', target: 't1', branchType: 'then', label: 'true' })
    );
    expect(r.edges).toContainEqual(
      expect.objectContaining({
        source: 'gate',
        target: placeholder?.id,
        branchType: 'else',
        label: 'false',
      })
    );

    // Both the then-leaf (t1) and the placeholder fan-in to 'after'.
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    expect(sourcesIntoAfter).toEqual([placeholder?.id, 't1'].sort());

    // The gate itself no longer connects directly to 'after'.
    expect(r.edges.find((e) => e.source === 'gate' && e.target === 'after')).toBeUndefined();
  });

  it('renders a placeholder lane for the missing then when only the else branch is present', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x > 1',
            else: [{ name: 'e1', type: 'http' }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );

    // A synthetic placeholder node should exist for the missing then lane.
    const placeholder = r.nodes.find((n) => n.type === 'placeholder');
    expect(placeholder).toBeDefined();
    expect((placeholder?.data as { branch?: string })?.branch).toBe('then');

    // Gate fans out to both the placeholder (true) and else-branch (e1) via bus edges.
    expect(r.edges).toContainEqual(
      expect.objectContaining({
        source: 'gate',
        target: placeholder?.id,
        branchType: 'then',
        label: 'true',
      })
    );
    expect(r.edges).toContainEqual(
      expect.objectContaining({ source: 'gate', target: 'e1', branchType: 'else', label: 'false' })
    );

    // Both the placeholder and the else-leaf (e1) fan-in to 'after'.
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    expect(sourcesIntoAfter).toEqual([placeholder?.id, 'e1'].sort());

    // The gate itself no longer connects directly to 'after'.
    expect(r.edges.find((e) => e.source === 'gate' && e.target === 'after')).toBeUndefined();
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

  it('nests foreach group inside an if-branch', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x',
            steps: [
              {
                name: 'loop',
                type: 'foreach',
                foreach: 'items',
                steps: [{ name: 'inner', type: 'http' }],
              },
            ],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    expect(r.foreachGroups).toHaveLength(1);
    expect(r.foreachGroups[0].id).toBe('loop');
    // The gate's true path goes to the foreach group node.
    expect(r.edges).toContainEqual(expect.objectContaining({ source: 'gate', target: 'loop' }));
  });

  it('handles parallel with N non-empty branches', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'par',
            type: 'parallel',
            branches: [
              { name: 'a', steps: [{ name: 'a1', type: 'http' }] },
              { name: 'b', steps: [{ name: 'b1', type: 'http' }] },
              { name: 'c', steps: [{ name: 'c1', type: 'http' }] },
            ],
          },
          { name: 'join', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    // All branch leaves feed into 'join'.
    const sourcesIntoJoin = r.edges
      .filter((e) => e.target === 'join')
      .map((e) => e.source)
      .sort();
    expect(sourcesIntoJoin).toEqual(['a1', 'b1', 'c1']);
  });

  it('falls through via gate id when all parallel branches are empty', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'par',
            type: 'parallel',
            branches: [
              { name: 'a', steps: [] },
              { name: 'b', steps: [] },
            ],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    // Both empty branches fall through via the parallel gate node's id.
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    // deduplicate because both branches fall through via the same gate id
    expect([...new Set(sourcesIntoAfter)]).toEqual(['par']);
  });

  // ── switch ────────────────────────────────────────────────────────────────

  it('labels switch-case edges with the match value and the default edge as "default" (Rule 1 + 2)', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'sw',
            type: 'switch',
            expression: '{{ steps.check.output.status }}',
            cases: [
              { match: 'success', steps: [{ name: 'on_success', type: 'http' }] },
              { match: 'error', steps: [{ name: 'on_error', type: 'http' }] },
            ],
            default: [{ name: 'on_unknown', type: 'http' }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const fromGate = r.edges.filter((e) => e.source === 'sw');
    const labels = fromGate.map((e) => e.label).sort();
    expect(labels).toEqual(['default', 'error', 'success']);
    // Case sub-step nodes exist (IdAllocator slugifies underscores to hyphens)
    expect(r.nodes.map((n) => n.id)).toEqual(
      expect.arrayContaining(['on-success', 'on-error', 'on-unknown'])
    );
    // With a default branch the switch is exhaustive — no plain fall-through edge from gate to 'after'.
    const plainEdgeToAfter = r.edges.find((e) => e.source === 'sw' && e.target === 'after');
    expect(plainEdgeToAfter).toBeUndefined();
    // All branch leaves connect to 'after'.
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    expect(sourcesIntoAfter).toEqual(['on-error', 'on-success', 'on-unknown']);
    // Each case/default edge carries branchType: 'switch' for bus routing.
    expect(r.edges).toContainEqual(
      expect.objectContaining({
        source: 'sw',
        target: 'on-success',
        branchType: 'switch',
        label: 'success',
      })
    );
    expect(r.edges).toContainEqual(
      expect.objectContaining({
        source: 'sw',
        target: 'on-error',
        branchType: 'switch',
        label: 'error',
      })
    );
    expect(r.edges).toContainEqual(
      expect.objectContaining({
        source: 'sw',
        target: 'on-unknown',
        branchType: 'switch',
        label: 'default',
      })
    );
  });

  it('synthesizes a labeled default placeholder lane when no explicit default (Rule 3)', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'sw',
            type: 'switch',
            expression: '{{ steps.x.output.v }}',
            cases: [{ match: 'a', steps: [{ name: 'on_a', type: 'http' }] }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );

    // A placeholder node should exist for the missing default lane.
    const placeholder = r.nodes.find((n) => n.type === 'placeholder');
    expect(placeholder).toBeDefined();
    expect((placeholder?.data as { branch?: string })?.branch).toBe('default');

    // Gate fans out to the placeholder via a labeled switch-bus edge.
    expect(r.edges).toContainEqual(
      expect.objectContaining({
        source: 'sw',
        target: placeholder?.id,
        branchType: 'switch',
        label: 'default',
      })
    );

    // No bare fall-through edge from the gate directly to 'after'.
    expect(r.edges.find((e) => e.source === 'sw' && e.target === 'after')).toBeUndefined();

    // Both the case leaf ('on-a') and the placeholder fan-in to 'after'.
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    expect(sourcesIntoAfter).toEqual(['on-a', placeholder?.id].sort());

    // The labeled case edge is unaffected.
    expect(r.edges).toContainEqual(
      expect.objectContaining({
        source: 'sw',
        target: 'on-a',
        branchType: 'switch',
        label: 'a',
      })
    );
  });

  it('chains multiple steps inside a switch case sequentially', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'sw',
            type: 'switch',
            expression: '{{ x }}',
            cases: [
              {
                match: 'go',
                steps: [
                  { name: 'step1', type: 'http' },
                  { name: 'step2', type: 'http' },
                ],
              },
            ],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    expect(r.edges).toContainEqual(expect.objectContaining({ source: 'step1', target: 'step2' }));
  });

  it('handles merge step with a single contained body', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'atomic',
            type: 'merge',
            steps: [
              { name: 'm1', type: 'http' },
              { name: 'm2', type: 'http' },
            ],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    // merge node connects to its first inner step
    expect(r.edges).toContainEqual(expect.objectContaining({ source: 'atomic', target: 'm1' }));
    // the merge node itself (not m2) is the exit point for the next step
    const sourcesIntoAfter = r.edges.filter((e) => e.target === 'after').map((e) => e.source);
    expect(sourcesIntoAfter).toEqual(['atomic']);
  });

  it('falls through via if gate when both branches are empty', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x',
            steps: [],
            else: [],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const sourcesIntoAfter = r.edges
      .filter((e) => e.target === 'after')
      .map((e) => e.source)
      .sort();
    // Both empty paths fall through via the gate id (may dedup to one).
    expect([...new Set(sourcesIntoAfter)]).toEqual(['gate']);
    const edgeIds = r.edges.map((e) => e.id);
    expect(edgeIds.length).toBe(new Set(edgeIds).size);
    expect(r.edges.filter((e) => e.target === 'after')).toHaveLength(1);
  });

  it('emits unique edge ids when all parallel branches are empty', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'par',
            type: 'parallel',
            branches: [
              { name: 'a', steps: [] },
              { name: 'b', steps: [] },
            ],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const edgeIds = r.edges.map((e) => e.id);
    expect(edgeIds.length).toBe(new Set(edgeIds).size);
    expect(r.edges.filter((e) => e.target === 'after')).toHaveLength(1);
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

  it('changes when a step is added', () => {
    const wfB = minimal({
      steps: [
        { name: 'a', type: 'http' },
        { name: 'b', type: 'http' },
      ] as unknown as WorkflowYaml['steps'],
    });
    expect(computeTopologyFingerprint(wfA)).not.toEqual(computeTopologyFingerprint(wfB));
  });

  it('changes when step order changes', () => {
    const wfBase = minimal({
      steps: [
        { name: 'a', type: 'http' },
        { name: 'b', type: 'http' },
      ] as unknown as WorkflowYaml['steps'],
    });
    const wfReordered = minimal({
      steps: [
        { name: 'b', type: 'http' },
        { name: 'a', type: 'http' },
      ] as unknown as WorkflowYaml['steps'],
    });
    expect(computeTopologyFingerprint(wfBase)).not.toEqual(computeTopologyFingerprint(wfReordered));
  });

  it('changes when a step inside a switch case is renamed', () => {
    const wfBase = minimal({
      steps: [
        {
          name: 'sw',
          type: 'switch',
          expression: '{{ x }}',
          cases: [{ match: 'a', steps: [{ name: 'inner', type: 'http' }] }],
        },
      ] as unknown as WorkflowYaml['steps'],
    });
    const wfMutated = minimal({
      steps: [
        {
          name: 'sw',
          type: 'switch',
          expression: '{{ x }}',
          cases: [{ match: 'a', steps: [{ name: 'inner_renamed', type: 'http' }] }],
        },
      ] as unknown as WorkflowYaml['steps'],
    });
    expect(computeTopologyFingerprint(wfBase)).not.toEqual(computeTopologyFingerprint(wfMutated));
  });

  it('changes when a switch default step is renamed', () => {
    const wfBase = minimal({
      steps: [
        {
          name: 'sw',
          type: 'switch',
          expression: '{{ x }}',
          cases: [{ match: 'a', steps: [{ name: 'on_a', type: 'http' }] }],
          default: [{ name: 'fallback', type: 'http' }],
        },
      ] as unknown as WorkflowYaml['steps'],
    });
    const wfMutated = minimal({
      steps: [
        {
          name: 'sw',
          type: 'switch',
          expression: '{{ x }}',
          cases: [{ match: 'a', steps: [{ name: 'on_a', type: 'http' }] }],
          default: [{ name: 'fallback_v2', type: 'http' }],
        },
      ] as unknown as WorkflowYaml['steps'],
    });
    expect(computeTopologyFingerprint(wfBase)).not.toEqual(computeTopologyFingerprint(wfMutated));
  });
});

// ─── nodeRefs ────────────────────────────────────────────────────────────────
describe('transformWorkflowToGraph — nodeRefs', () => {
  it('returns an empty nodeRefs map for undefined workflow', () => {
    const r = transformWorkflowToGraph(undefined);
    expect(r.nodeRefs).toEqual({});
  });

  it('maps trigger node id to kind:trigger with correct index and type', () => {
    const r = transformWorkflowToGraph(
      minimal({
        triggers: [{ type: 'manual', enabled: true }] as unknown as WorkflowYaml['triggers'],
        steps: [],
      })
    );
    const triggerNode = r.nodes.find((n) => n.type === 'trigger');
    expect(triggerNode).toBeDefined();
    expect(r.nodeRefs[triggerNode!.id]).toEqual({
      kind: 'trigger',
      triggerIndex: 0,
      triggerType: 'manual',
    });
  });

  it('maps multiple triggers by declaration index — two triggers of the same type', () => {
    // This is the case the old "one trigger per type" heuristic would have got wrong.
    const r = transformWorkflowToGraph(
      minimal({
        triggers: [
          { type: 'alert', enabled: true },
          { type: 'alert', enabled: true },
        ] as unknown as WorkflowYaml['triggers'],
        steps: [],
      })
    );
    const triggerNodes = r.nodes.filter((n) => n.type === 'trigger');
    expect(triggerNodes).toHaveLength(2);
    // Each maps to its own index; types are both 'alert' but indices differ.
    const refs = triggerNodes.map((n) => r.nodeRefs[n.id]);
    expect(refs).toContainEqual({ kind: 'trigger', triggerIndex: 0, triggerType: 'alert' });
    expect(refs).toContainEqual({ kind: 'trigger', triggerIndex: 1, triggerType: 'alert' });
    // The two node ids must be different.
    expect(triggerNodes[0].id).not.toEqual(triggerNodes[1].id);
  });

  it('maps regular step node id to kind:step with the exact step name', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          { name: 'fetch-data', type: 'http', with: { url: 'x' } },
          { name: 'send-alert', type: 'http', with: { url: 'y' } },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const fetchNode = r.nodes.find((n) => 'label' in n.data && n.data.label === 'fetch-data');
    const alertNode = r.nodes.find((n) => 'label' in n.data && n.data.label === 'send-alert');
    expect(fetchNode).toBeDefined();
    expect(alertNode).toBeDefined();
    expect(r.nodeRefs[fetchNode!.id]).toEqual({ kind: 'step', stepName: 'fetch-data' });
    expect(r.nodeRefs[alertNode!.id]).toEqual({ kind: 'step', stepName: 'send-alert' });
  });

  it('maps the foreach container node to kind:step with the foreach step name', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'loop-over-items',
            type: 'foreach',
            each: '{{ items }}',
            steps: [{ name: 'inner-step', type: 'http', with: { url: 'x' } }],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const groupNode = r.nodes.find((n) => n.type === 'foreachGroup');
    const innerNode = r.foreachGroups[0]?.innerNodes[0];
    expect(groupNode).toBeDefined();
    expect(innerNode).toBeDefined();
    expect(r.nodeRefs[groupNode!.id]).toEqual({ kind: 'step', stepName: 'loop-over-items' });
    expect(r.nodeRefs[innerNode!.id]).toEqual({ kind: 'step', stepName: 'inner-step' });
  });

  it('maps branch-body step nodes inside an if block to kind:step', () => {
    const r = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x > 1',
            steps: [{ name: 'then-step', type: 'http' }],
            else: [{ name: 'else-step', type: 'http' }],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const gateNode = r.nodes.find((n) => 'label' in n.data && n.data.label === 'gate');
    const thenNode = r.nodes.find((n) => 'label' in n.data && n.data.label === 'then-step');
    const elseNode = r.nodes.find((n) => 'label' in n.data && n.data.label === 'else-step');
    expect(r.nodeRefs[gateNode!.id]).toEqual({ kind: 'step', stepName: 'gate' });
    expect(r.nodeRefs[thenNode!.id]).toEqual({ kind: 'step', stepName: 'then-step' });
    expect(r.nodeRefs[elseNode!.id]).toEqual({ kind: 'step', stepName: 'else-step' });
  });

  it('covers every node id — no node is missing from nodeRefs', () => {
    // A complex workflow with triggers + flat steps + if + parallel.
    const r = transformWorkflowToGraph(
      minimal({
        triggers: [
          { type: 'manual', enabled: true },
          { type: 'scheduled', enabled: true, with: { every: '1h' } },
        ] as unknown as WorkflowYaml['triggers'],
        steps: [
          { name: 'first', type: 'http', with: { url: 'x' } },
          {
            name: 'fan-out',
            type: 'parallel',
            branches: [
              { name: 'branch-a', steps: [{ name: 'step-a', type: 'http' }] },
              { name: 'branch-b', steps: [{ name: 'step-b', type: 'http' }] },
            ],
          },
          { name: 'last', type: 'http', with: { url: 'z' } },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    // Collect all node ids from nodes + foreachGroup inner nodes.
    // Exclude `placeholder` nodes — they are synthetic lane fillers for empty
    // `if` branches and are intentionally absent from nodeRefs.
    const allIds = [
      ...r.nodes.filter((n) => n.type !== 'placeholder').map((n) => n.id),
      ...r.foreachGroups.flatMap((g) => g.innerNodes.map((n) => n.id)),
    ];
    for (const id of allIds) {
      expect(r.nodeRefs).toHaveProperty(id);
    }
  });

  describe('isMerge edge tagging (placeholder-lane fan-in)', () => {
    it('tags both fan-in edges isMerge:true for a then-only if (placeholder on else lane)', () => {
      // if_only topology: if(then=bye, no else) → switch_no_default
      // Both `bye → switch` and `else-placeholder → switch` must carry isMerge:true.
      const r = transformWorkflowToGraph(
        minimal({
          steps: [
            {
              name: 'gate',
              type: 'if',
              condition: 'x',
              steps: [{ name: 'bye', type: 'http' }],
            } as unknown as WorkflowYaml['steps'][number],
            { name: 'next', type: 'http' } as unknown as WorkflowYaml['steps'][number],
          ] as unknown as WorkflowYaml['steps'],
        })
      );
      const fanInEdges = r.edges.filter((e) => e.target === 'next');
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => e.isMerge === true)).toBe(true);
    });

    it('tags both fan-in edges isMerge:true for an else-only if (placeholder on then lane)', () => {
      // if(no then, else=bye) → next: same tagging on the other side
      const r = transformWorkflowToGraph(
        minimal({
          steps: [
            {
              name: 'gate',
              type: 'if',
              condition: 'x',
              steps: [],
              else: [{ name: 'bye', type: 'http' }],
            } as unknown as WorkflowYaml['steps'][number],
            { name: 'next', type: 'http' } as unknown as WorkflowYaml['steps'][number],
          ] as unknown as WorkflowYaml['steps'],
        })
      );
      const fanInEdges = r.edges.filter((e) => e.target === 'next');
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => e.isMerge === true)).toBe(true);
    });

    it('does NOT tag a plain sequential edge as isMerge', () => {
      const r = transformWorkflowToGraph(
        minimal({
          steps: [
            { name: 'a', type: 'http' } as unknown as WorkflowYaml['steps'][number],
            { name: 'b', type: 'http' } as unknown as WorkflowYaml['steps'][number],
          ] as unknown as WorkflowYaml['steps'],
        })
      );
      const edge = r.edges.find((e) => e.source === 'a' && e.target === 'b');
      expect(edge).toBeDefined();
      expect(edge?.isMerge).toBeUndefined();
    });

    it('does NOT tag a real if/else join as isMerge (no placeholder involved)', () => {
      // Both branches present → no placeholder → fan-in edges stay untagged.
      const r = transformWorkflowToGraph(
        minimal({
          steps: [
            {
              name: 'gate',
              type: 'if',
              condition: 'x',
              steps: [{ name: 'yes', type: 'http' }],
              else: [{ name: 'no', type: 'http' }],
            } as unknown as WorkflowYaml['steps'][number],
            { name: 'next', type: 'http' } as unknown as WorkflowYaml['steps'][number],
          ] as unknown as WorkflowYaml['steps'],
        })
      );
      const fanInEdges = r.edges.filter((e) => e.target === 'next');
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => e.isMerge === undefined)).toBe(true);
    });

    it('does NOT tag a parallel join as isMerge (no placeholder involved)', () => {
      const r = transformWorkflowToGraph(
        minimal({
          steps: [
            {
              name: 'fan',
              type: 'parallel',
              branches: [
                { name: 'a', steps: [{ name: 'step-a', type: 'http' }] },
                { name: 'b', steps: [{ name: 'step-b', type: 'http' }] },
              ],
            } as unknown as WorkflowYaml['steps'][number],
            { name: 'next', type: 'http' } as unknown as WorkflowYaml['steps'][number],
          ] as unknown as WorkflowYaml['steps'],
        })
      );
      const fanInEdges = r.edges.filter((e) => e.target === 'next');
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => e.isMerge === undefined)).toBe(true);
    });
  });
});
