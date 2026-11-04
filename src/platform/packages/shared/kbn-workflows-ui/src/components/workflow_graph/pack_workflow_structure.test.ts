/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedNode } from '@kbn/dag-layout';
import type {
  LayoutDirection,
  StructureBranch,
  StructureContainer,
  StructureFork,
  StructureItem,
  StructureLane,
  StructureSequence,
  StructureStep,
} from '@kbn/workflows';
import { edgeLabelCrossSpan } from './edge_label_metrics';
import { packCrossAxis } from './pack_workflow_structure';
import { WORKFLOW_COMPOUND_PADDING, WORKFLOW_NODE_SEP } from './workflow_layout_pipeline';

const NODE_WIDTH = 300;
const NODE_HEIGHT = 52;

const step = (id: string, extra: Partial<StructureStep> = {}): StructureStep => ({
  kind: 'step',
  id,
  lanes: [],
  ...extra,
});
const lane = (head: string, items: StructureSequence): StructureLane => ({
  head,
  items,
  rejoins: false,
});
const branch = (...items: StructureItem[]): StructureBranch => ({
  head: items[0].id,
  items,
  label: 'branch',
});
const bypass = (head: string, label = 'false'): StructureBranch => ({ head, items: [], label });
const fork = (id: string, branches: StructureBranch[]): StructureFork => ({
  kind: 'fork',
  id,
  branches,
  lanes: [],
});
const container = (
  id: string,
  body: StructureSequence,
  lanes: StructureLane[] = []
): StructureContainer => ({ kind: 'container', id, body, lanes });

const node = (id: string, width = NODE_WIDTH, height = NODE_HEIGHT): DagPositionedNode => ({
  id,
  x: 0,
  y: 0,
  width,
  height,
});

const pack = (
  items: StructureSequence,
  nodes: DagPositionedNode[],
  { triggers = [], direction = 'TB' }: { triggers?: string[]; direction?: LayoutDirection } = {}
) => {
  const packed = packCrossAxis({
    structure: { triggers, items },
    nodes,
    direction,
    nodeSep: WORKFLOW_NODE_SEP,
    compoundPadding: WORKFLOW_COMPOUND_PADDING,
  });
  const byId = new Map(packed.map((n) => [n.id, n]));
  const get = (id: string): DagPositionedNode => {
    const found = byId.get(id);
    if (!found) throw new Error(`Expected node "${id}"`);
    return found;
  };
  return { get, centre: (id: string) => get(id).x + get(id).width / 2 };
};

const nodes = (...ids: string[]) => ids.map((id) => node(id));

describe('packCrossAxis', () => {
  it('puts a chain of steps on one spine column, starting at 0', () => {
    const { get, centre } = pack([step('a'), step('b')], nodes('a', 'b'));
    expect(get('a').x).toBe(0);
    expect(centre('b')).toBe(centre('a'));
  });

  it('places a fallback lane one nodeSep past the right edge of its owner', () => {
    const { get } = pack(
      [step('owner', { lanes: [lane('l1', [step('l1')])] })],
      nodes('owner', 'l1')
    );
    expect(get('l1').x).toBe(get('owner').x + NODE_WIDTH + WORKFLOW_NODE_SEP);
  });

  it('puts nested lanes further out than the lane holding their owner', () => {
    const { get } = pack(
      [
        step('owner', {
          lanes: [lane('l1', [step('l1', { lanes: [lane('l2', [step('l2')])] })])],
        }),
      ],
      nodes('owner', 'l1', 'l2')
    );
    expect(get('l1').x).toBeGreaterThan(get('owner').x + NODE_WIDTH);
    expect(get('l2').x).toBe(get('l1').x + NODE_WIDTH + WORKFLOW_NODE_SEP);
  });

  it('keeps the body of a merge step to the right of it', () => {
    const { get } = pack([step('m', { attached: [step('a1')] })], nodes('m', 'a1'));
    expect(get('a1').x).toBe(get('m').x + NODE_WIDTH + WORKFLOW_NODE_SEP);
  });

  it('keeps the body of a merge step clear of the steps that follow it', () => {
    // The body hangs off the merge step, but the fork after it shares its rows.
    const { get } = pack(
      [
        step('m', { attached: [step('a1'), step('a2')] }),
        fork('gate', [branch(step('t1')), branch(step('e1'))]),
      ],
      nodes('m', 'a1', 'a2', 'gate', 't1', 'e1')
    );
    const followingRight = Math.max(...['gate', 't1', 'e1'].map((id) => get(id).x + get(id).width));
    expect(get('a1').x).toBeGreaterThanOrEqual(followingRight + WORKFLOW_NODE_SEP);
    expect(get('a2').x).toBe(get('a1').x);
  });

  it('keeps the bodies of consecutive merge steps clear of each other', () => {
    // The second body is pushed past the wide fork after it, so the first must clear that.
    const { get } = pack(
      [
        step('m1', { attached: [step('a1')] }),
        step('m2', { attached: [step('b1')] }),
        fork(
          'gate',
          [1, 2, 3, 4].map((n) => branch(step(`c${n}`)))
        ),
      ],
      nodes('m1', 'a1', 'm2', 'b1', 'gate', 'c1', 'c2', 'c3', 'c4')
    );
    expect(get('a1').x).toBeGreaterThanOrEqual(get('b1').x + NODE_WIDTH + WORKFLOW_NODE_SEP);
  });

  it('measures each item once however deeply merge steps are nested', () => {
    let measurements = 0;
    const leaf: StructureStep = {
      kind: 'step',
      id: 'leaf',
      get lanes() {
        measurements += 1;
        return [];
      },
    };
    const nested = Array.from({ length: 12 }).reduce<StructureStep>(
      (inner, _, depth) => step(`m${depth}`, { attached: [inner] }),
      leaf
    );
    pack([nested], nodes('leaf'));
    expect(measurements).toBe(1);
  });

  describe('forks', () => {
    it('packs unequal branches side by side, centres the owner on the outer heads and the join under it', () => {
      const { get, centre } = pack(
        [
          fork('gate', [
            branch(step('a1', { lanes: [lane('l', [step('l')])] })),
            branch(step('b1')),
          ]),
          step('after'),
        ],
        nodes('gate', 'a1', 'l', 'b1', 'after')
      );
      // The lane belongs to the first branch, so the second branch starts after it.
      expect(get('b1').x - (get('l').x + NODE_WIDTH)).toBe(WORKFLOW_NODE_SEP);
      expect(centre('gate')).toBe((centre('a1') + centre('b1')) / 2);
      expect(centre('after')).toBe(centre('gate'));
      expect(centre('a1')).toBeLessThan(centre('b1'));
    });

    it('centres each owner of nested forks and puts the join under the outer one', () => {
      const { centre } = pack(
        [
          fork('g', [
            branch(fork('ig', [branch(step('p')), branch(step('q'))])),
            branch(step('r')),
          ]),
          step('join'),
        ],
        nodes('g', 'ig', 'p', 'q', 'r', 'join')
      );
      expect(centre('ig')).toBe((centre('p') + centre('q')) / 2);
      expect(centre('g')).toBe((centre('ig') + centre('r')) / 2);
      expect(centre('join')).toBe(centre('g'));
    });

    it('keeps chains inside a branch on that branch’s column', () => {
      const { centre } = pack(
        [fork('gate', [branch(step('a1'), step('a2')), branch(step('b1'))])],
        nodes('gate', 'a1', 'a2', 'b1')
      );
      expect(centre('a2')).toBe(centre('a1'));
    });

    it('gives an empty branch a bypass head that reserves room for its edge label', () => {
      const { get, centre } = pack(
        [fork('gate', [branch(step('x')), bypass('byp', 'false')])],
        [...nodes('gate', 'x'), node('byp', 1, 1)]
      );
      const labelSpan = edgeLabelCrossSpan('false', 'TB');
      expect(get('byp').width).toBe(labelSpan);
      expect(centre('byp') - centre('x')).toBe(NODE_WIDTH / 2 + WORKFLOW_NODE_SEP + labelSpan / 2);
      expect(centre('gate')).toBe((centre('x') + centre('byp')) / 2);
    });

    it('LR: a bypass head reserves the label height instead of its width', () => {
      const { get } = pack(
        [fork('gate', [branch(step('x')), bypass('byp', 'a long case label')])],
        [...nodes('gate', 'x'), node('byp', 1, 1)],
        { direction: 'LR' }
      );
      expect(get('byp').height).toBe(edgeLabelCrossSpan('a long case label', 'LR'));
      expect(get('byp').height).toBeLessThan(edgeLabelCrossSpan('a long case label', 'TB'));
    });

    it('reserves at most the room of the longest label the edge draws', () => {
      expect(edgeLabelCrossSpan('x'.repeat(200), 'TB')).toBe(
        edgeLabelCrossSpan('x'.repeat(24), 'TB')
      );
    });

    it('puts a lane of the fork owner beyond everything the branches reach', () => {
      const { get } = pack(
        [
          {
            ...fork('gate', [branch(step('a1')), branch(step('b1'))]),
            lanes: [lane('l', [step('l')])],
          },
        ],
        nodes('gate', 'a1', 'b1', 'l')
      );
      expect(get('l').x).toBe(get('b1').x + NODE_WIDTH + WORKFLOW_NODE_SEP);
    });
  });

  describe('containers', () => {
    it('TB: the box is the body plus padding, the body sits on the left padding, and the box is on the spine', () => {
      const { get, centre } = pack(
        [container('box', [step('i1'), step('i2')]), step('after')],
        [node('box', 999, 400), ...nodes('i1', 'i2', 'after')]
      );
      const { left, right } = WORKFLOW_COMPOUND_PADDING;
      expect(get('box').width).toBe(NODE_WIDTH + left + right);
      expect(get('i1').x).toBe(get('box').x + left);
      expect(centre('box')).toBe(centre('after'));
    });

    it('LR: the box is the body plus the top and bottom padding on the cross axis', () => {
      const { get, centre } = pack(
        [container('box', [step('i1')]), step('after')],
        [node('box', 400, 999), ...nodes('i1', 'after')],
        { direction: 'LR' }
      );
      const { top, bottom } = WORKFLOW_COMPOUND_PADDING;
      expect(get('box').height).toBe(NODE_HEIGHT + top + bottom);
      expect(get('i1').y).toBe(get('box').y + top);
      expect(get('box').y + get('box').height / 2).toBe(get('after').y + NODE_HEIGHT / 2);
      expect(centre('box')).toBe(get('box').x + 200);
    });

    it('hugs an asymmetric body: no empty space on either side', () => {
      const { get } = pack(
        [
          container('box', [
            fork('gate', [branch(step('a1', { lanes: [lane('l', [step('l')])] })), bypass('byp')]),
          ]),
        ],
        [node('box', 999, 400), ...nodes('gate', 'a1', 'l'), node('byp', 1, 1)]
      );
      const { left, right } = WORKFLOW_COMPOUND_PADDING;
      const members = ['gate', 'a1', 'l', 'byp'].map(get);
      const bodyStart = Math.min(...members.map((n) => n.x));
      const bodyEnd = Math.max(...members.map((n) => n.x + n.width));
      expect(bodyStart - get('box').x).toBe(left);
      expect(get('box').x + get('box').width - bodyEnd).toBe(right);
    });

    it('fits nested containers inside out', () => {
      const { get } = pack(
        [container('outer', [container('inner', [step('s')])])],
        [node('outer', 999, 400), node('inner', 999, 300), node('s')]
      );
      const { left, right } = WORKFLOW_COMPOUND_PADDING;
      expect(get('inner').width).toBe(NODE_WIDTH + left + right);
      expect(get('outer').width).toBe(NODE_WIDTH + 2 * (left + right));
      expect(get('s').x).toBe(get('inner').x + left);
    });

    it('puts a lane of the container beyond its box', () => {
      const { get } = pack(
        [container('box', [step('i1')], [lane('l', [step('l')])])],
        [node('box', 999, 400), ...nodes('i1', 'l')]
      );
      expect(get('l').x).toBe(get('box').x + get('box').width + WORKFLOW_NODE_SEP);
    });

    it('keeps the size of a container with an empty body', () => {
      const { get } = pack([container('box', [])], [node('box', 500, 200)]);
      expect(get('box').width).toBe(500);
    });
  });

  it('lays triggers out as a centred row in declaration order above the first step', () => {
    const { get, centre } = pack([step('s')], nodes('t1', 't2', 's'), { triggers: ['t1', 't2'] });
    expect(get('t2').x - (get('t1').x + NODE_WIDTH)).toBe(WORKFLOW_NODE_SEP);
    expect(centre('s')).toBe((centre('t1') + centre('t2')) / 2);
  });

  it('only changes the cross axis, never mutates its input and leaves unmentioned nodes alone', () => {
    const input = [node('a'), node('stray')];
    input[0] = { ...input[0], y: 123 };
    const copy = input.map((n) => ({ ...n }));
    const packed = packCrossAxis({
      structure: { triggers: [], items: [step('a')] },
      nodes: input,
      direction: 'TB',
      nodeSep: WORKFLOW_NODE_SEP,
      compoundPadding: WORKFLOW_COMPOUND_PADDING,
    });
    expect(input).toEqual(copy);
    expect(packed[0].y).toBe(123);
    expect(packed[1]).toBe(input[1]);
  });
});
