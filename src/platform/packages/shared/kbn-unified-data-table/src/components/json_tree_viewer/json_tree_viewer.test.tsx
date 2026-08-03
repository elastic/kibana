/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonTreeViewer, type TreeExpansionState } from './json_tree_viewer';

describe('JsonTreeViewer', () => {
  it('renders the top-level keys and values of an object', () => {
    render(<JsonTreeViewer json={{ message: 'hello', count: 5 }} />);

    expect(screen.getByRole('treeitem', { name: /message/i })).toBeVisible();
    expect(screen.getByText('"hello"')).toBeVisible();
    expect(screen.getByText('5')).toBeVisible();
  });

  // In-table search remounts every cell on each keystroke (a search-term-keyed React `key` on the
  // grid's highlight wrapper), which would collapse the tree. The host persists the state and seeds
  // a fresh instance with it; these tests prove a remounted instance comes up already expanded.
  it('restores an expanded node on a fresh instance seeded with the persisted state', async () => {
    const doc = { user: { name: 'Alice', city: 'Berlin' } };
    let lastState: TreeExpansionState | undefined;

    const { unmount } = render(
      <JsonTreeViewer json={doc} onStateChange={(state) => (lastState = state)} />
    );

    // Collapsed: the nested value is not rendered.
    expect(screen.queryByText('"Alice"')).not.toBeInTheDocument();

    // Expanding reveals the child and reports the new state to the host.
    await userEvent.click(screen.getByRole('treeitem', { name: /user/i }));
    expect(screen.getByText('"Alice"')).toBeVisible();
    expect(lastState?.expanded.size).toBe(1);

    // A brand-new instance (as after a remount) seeded with that state is already expanded.
    unmount();
    render(<JsonTreeViewer json={doc} initialState={lastState} />);
    expect(screen.getByText('"Alice"')).toBeVisible();
  });

  it('restores a revealed ("show more") collection on a fresh instance seeded with the persisted state', async () => {
    // 12 fields: only the first 10 render until "show more" lifts the per-collection cap.
    const doc = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`field_${i}`, `value_${i}`])
    );
    let lastState: TreeExpansionState | undefined;

    const { unmount } = render(
      <JsonTreeViewer json={doc} onStateChange={(state) => (lastState = state)} />
    );

    // The 12th field is capped away initially.
    expect(screen.queryByText('"value_11"')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('treeitem', { name: /show 2 more fields/i }));
    expect(screen.getByText('"value_11"')).toBeVisible();
    expect(lastState?.revealed.size).toBe(1);

    // A fresh instance seeded with that state keeps the revealed field visible.
    unmount();
    render(<JsonTreeViewer json={doc} initialState={lastState} />);
    expect(screen.getByText('"value_11"')).toBeVisible();
  });

  // In-table search only sees rendered DOM text, so a value inside a collapsed node is invisible to
  // it. With a search term the tree auto-expands every collection that contains a match so the value
  // renders — and the grid's counter/highlight/navigation then pick it up.
  describe('in-table search auto-expand', () => {
    const doc = { user: { city: 'Berlin' }, org: { name: 'Acme' } };

    it('expands a collapsed container so a hidden match renders, leaving non-matches collapsed', () => {
      render(<JsonTreeViewer json={doc} searchTerm="berl" />);

      // `user` was collapsed; the match forces it open.
      expect(screen.getByText('"Berlin"')).toBeVisible();
      // `org` has no match and stays collapsed.
      expect(screen.queryByText('"Acme"')).not.toBeInTheDocument();
    });

    it('does not auto-expand anything without a search term', () => {
      render(<JsonTreeViewer json={doc} />);
      expect(screen.queryByText('"Berlin"')).not.toBeInTheDocument();
      expect(screen.queryByText('"Acme"')).not.toBeInTheDocument();
    });

    it('keeps the search-driven expansion out of the persisted host state', () => {
      const states: TreeExpansionState[] = [];
      render(<JsonTreeViewer json={doc} searchTerm="berl" onStateChange={(s) => states.push(s)} />);

      // The match is visible (auto-expanded)…
      expect(screen.getByText('"Berlin"')).toBeVisible();
      // …but the persisted user state stays empty — the search expansion is transient.
      expect(states[states.length - 1].expanded.size).toBe(0);
    });
  });
});
