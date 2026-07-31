/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
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

  // In-table search only sees rendered DOM text, so it can't reach values inside collapsed nodes.
  // The tree flags those collapsed nodes as a hint to expand there.
  describe('in-table search hidden-match indicator', () => {
    const doc = { user: { city: 'Berlin' }, org: { name: 'Acme' } };

    it('flags a collapsed container whose hidden subtree contains the term, and only that one', () => {
      render(<JsonTreeViewer json={doc} searchTerm="berl" />);

      const userRow = screen.getByRole('treeitem', { name: /user/i });
      expect(within(userRow).getByTestId('jsonTreeViewerHiddenMatch')).toBeVisible();

      const orgRow = screen.getByRole('treeitem', { name: /org/i });
      expect(within(orgRow).queryByTestId('jsonTreeViewerHiddenMatch')).not.toBeInTheDocument();
    });

    it('flags nothing without a search term', () => {
      render(<JsonTreeViewer json={doc} />);
      expect(screen.queryByTestId('jsonTreeViewerHiddenMatch')).not.toBeInTheDocument();
    });

    it('drops the flag once the container is expanded, where the match renders normally', async () => {
      render(<JsonTreeViewer json={doc} searchTerm="berl" />);
      expect(screen.getByTestId('jsonTreeViewerHiddenMatch')).toBeVisible();

      await userEvent.click(screen.getByRole('treeitem', { name: /user/i }));

      expect(screen.queryByTestId('jsonTreeViewerHiddenMatch')).not.toBeInTheDocument();
      expect(screen.getByText('"Berlin"')).toBeVisible();
    });
  });
});
