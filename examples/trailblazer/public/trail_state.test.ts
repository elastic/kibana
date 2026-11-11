/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TrailContext } from './context';
import type { Pane } from './trail';
import type { TrailStep } from './trail_state';
import { decodeTrail, encodeTrail, restoreTrail } from './trail_state';

const search = { index: 'logs-*', language: 'kql', query: 'a: 1' } as const;

const STEPS: TrailStep[] = [
  { pane: 'index_list', kind: 'data_stream' },
  { pane: 'index', search },
  { pane: 'document', search, index: '.ds-logs-1', id: 'doc-1' },
  { pane: 'field', search, field: 'host.name' },
  { pane: 'saved_object_types' },
  { pane: 'saved_objects', type: 'alert' },
  { pane: 'saved_object', target: { type: 'alert', id: 'r1', space: 'default' } },
];

describe('decodeTrail', () => {
  it('round trips every kind of step', () => {
    expect(decodeTrail(encodeTrail(STEPS))).toEqual(STEPS);
  });

  it('keeps valid steps up to the first invalid one', () => {
    const text = JSON.stringify([
      { pane: 'index_list', kind: 'index' },
      { pane: 'index', search: { index: 'x', language: 'sql', query: '' } },
      { pane: 'saved_object_types' },
    ]);
    expect(decodeTrail(text)).toEqual([{ pane: 'index_list', kind: 'index' }]);
  });

  it('ignores missing, malformed, and non-array input', () => {
    expect(decodeTrail(null)).toEqual([]);
    expect(decodeTrail('{oops')).toEqual([]);
    expect(decodeTrail('{"pane":"index_list"}')).toEqual([]);
  });
});

describe('restoreTrail', () => {
  function fakeContext() {
    const panes: Pane[] = [];
    function pane(name: string): Pane {
      return {
        element: document.createElement('div'),
        title: () => name,
        focus: jest.fn(),
        destroy: jest.fn(),
      };
    }
    function open(parent: Pane, name: string) {
      panes.splice(panes.indexOf(parent) + 1);
      const child = pane(name);
      panes.push(child);
      return child;
    }
    const root = pane('root');
    panes.push(root);
    const ctx = {
      trail: { isLast: (candidate: Pane) => panes[panes.length - 1] === candidate },
      openIndexList: (parent: Pane) => open(parent, 'list'),
      openIndex: (parent: Pane) => open(parent, 'index'),
      openSavedObjectTypes: (parent: Pane) => open(parent, 'types'),
      openSavedObject: (parent: Pane) => open(parent, 'object'),
    } as unknown as TrailContext;
    return { ctx, root, panes, open };
  }

  it('opens each step to the right of the previous one', async () => {
    const { ctx, root, panes } = fakeContext();
    await restoreTrail(ctx, root, STEPS.slice(0, 2), new AbortController().signal);
    expect(panes.map((pane) => pane.title())).toEqual(['root', 'list', 'index']);
    expect(panes[2].focus).toHaveBeenCalled();
  });

  it('stops once the user opens something else', async () => {
    const { ctx, root, panes, open } = fakeContext();
    open(root, 'user choice');
    await restoreTrail(ctx, root, STEPS.slice(0, 2), new AbortController().signal);
    expect(panes.map((pane) => pane.title())).toEqual(['root', 'user choice']);
  });
});
