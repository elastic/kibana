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
import { copyToClipboard } from '@elastic/eui';
import { JsonTreeViewer, type FormatValue, type TreeExpansionState } from './json_tree_viewer';

// Keep every real EUI component; only stub the clipboard side-effect so copies are assertable.
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));
const copyToClipboardMock = jest.mocked(copyToClipboard);

describe('JsonTreeViewer', () => {
  it('renders the top-level keys and values of an object', () => {
    render(<JsonTreeViewer json={{ message: 'hello', count: 5 }} />);

    expect(screen.getByRole('treeitem', { name: /message/i })).toBeVisible();
    expect(screen.getByText('"hello"')).toBeVisible();
    expect(screen.getByText('5')).toBeVisible();
  });

  // When rendered as an EuiDataGrid cell, the grid moves the focused cell from a bubble-phase
  // keydown on the grid body. The tree must claim its own navigation keys (stopPropagation) so they
  // move between tree rows, not between grid cells.
  it('owns its arrow-key navigation instead of letting it bubble to an ancestor', async () => {
    let bubbledKey: string | undefined;
    render(
      <div onKeyDown={(event) => (bubbledKey = event.key)}>
        <JsonTreeViewer json={{ a: 1, b: 2, c: 3 }} />
      </div>
    );

    const [firstRow, secondRow] = screen.getAllByRole('treeitem');
    firstRow.focus();
    await userEvent.keyboard('{ArrowDown}');

    // Focus moved within the tree…
    expect(secondRow).toHaveFocus();
    // …and the key never reached the ancestor, where the grid's cell navigation would run.
    expect(bubbledKey).toBeUndefined();
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

  // Once a list is revealed past its cap but still has hidden items, "Show more" and "Show fewer"
  // share the same pager row instead of stacking on two lines.
  it('shows "Show more" and "Show fewer" on the same pager row past the cap', async () => {
    // 25 fields: after one "show more" (10 → 20) five stay hidden AND it is past the cap, so both
    // affordances apply at once.
    const doc = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`field_${i}`, i]));
    render(<JsonTreeViewer json={doc} />);

    // At the initial cap only "Show more" is offered.
    expect(screen.queryByRole('button', { name: /show fewer fields/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('treeitem', { name: /show 10 more fields/i }));

    // Both affordances now live inside the one pager row (same line).
    const pager = screen.getByRole('treeitem', { name: /show 5 more fields/i });
    expect(within(pager).getByText(/show 5 more fields/i)).toBeVisible();
    const showFewer = within(pager).getByRole('button', { name: /show fewer fields/i });
    expect(showFewer).toBeVisible();

    // "Show fewer" collapses the list back to the initial cap, leaving only "Show more".
    await userEvent.click(showFewer);
    expect(screen.queryByRole('button', { name: /show fewer fields/i })).not.toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /show 10 more fields/i })).toBeVisible();
  });

  // Inside an EuiDataGrid cell the tree must let the keyboard reach its controls and hand focus back
  // to the grid — all via its own key handling, without a focus trap.
  describe('keyboard reaches the tree controls', () => {
    it('steps from a leaf row into its copy-value button with ArrowRight', async () => {
      render(<JsonTreeViewer json={{ message: 'hello' }} />);

      screen.getByRole('treeitem', { name: /message/i }).focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(screen.getByRole('button', { name: 'Copy value' })).toHaveFocus();
    });

    it('steps from the first row up to the Expand all control with ArrowUp', async () => {
      render(<JsonTreeViewer json={{ user: { city: 'Berlin' } }} />);

      // `user` is a collapsed collection, so it is the first (and only) visible row.
      screen.getByRole('treeitem', { name: /user/i }).focus();
      await userEvent.keyboard('{ArrowUp}');

      expect(screen.getByRole('button', { name: /expand all/i })).toHaveFocus();
    });

    it('leaves Escape for its host, which returns focus to the grid cell', async () => {
      // The tree itself stays unaware of the grid: it lets Escape bubble, and the host turns that
      // into "focus the enclosing cell" — mirroring how the cell renderer wires it.
      render(
        <div role="gridcell" tabIndex={-1} data-test-subj="gridcell">
          <span
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                event.currentTarget.closest<HTMLElement>('[role="gridcell"]')?.focus();
              }
            }}
          >
            <JsonTreeViewer json={{ message: 'hello' }} />
          </span>
        </div>
      );

      screen.getByRole('treeitem', { name: /message/i }).focus();
      await userEvent.keyboard('{Escape}');

      expect(screen.getByTestId('gridcell')).toHaveFocus();
    });
  });

  // In-table search only sees rendered DOM text, so a value inside a collapsed node is invisible to
  // it. With a search term the tree auto-expands every collection that contains a match so the value
  // renders — and the grid's counter/highlight/navigation then pick it up.
  describe('in-table search auto-expand', () => {
    const doc = { user: { city: 'Berlin' }, org: { name: 'Acme' } };

    it('expands a collapsed container so a hidden match renders, leaving non-matches collapsed', () => {
      render(<JsonTreeViewer json={doc} expandNodesContainingTerm="berl" />);

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
      render(
        <JsonTreeViewer
          json={doc}
          expandNodesContainingTerm="berl"
          onStateChange={(s) => states.push(s)}
        />
      );

      // The match is visible (auto-expanded)…
      expect(screen.getByText('"Berlin"')).toBeVisible();
      // …but the persisted user state stays empty — the search expansion is transient.
      expect(states[states.length - 1].expanded.size).toBe(0);
    });
  });

  // Every leaf value can be copied as raw text, and every collection can be copied as JSON — the
  // whole subtree, not just the currently-revealed slice — with in-place "Copied" confirmation.
  describe('copying values and subtrees', () => {
    beforeEach(() => copyToClipboardMock.mockClear());

    it('copies a collapsed object subtree as pretty-printed JSON', async () => {
      render(<JsonTreeViewer json={{ user: { name: 'Alice', city: 'Berlin' } }} />);

      await userEvent.click(screen.getByRole('button', { name: 'Copy object' }));

      expect(copyToClipboardMock).toHaveBeenCalledWith(
        JSON.stringify({ name: 'Alice', city: 'Berlin' }, null, 2)
      );
    });

    it('copies an array subtree as pretty-printed JSON', async () => {
      render(<JsonTreeViewer json={{ tags: ['authentication', 'security'] }} />);

      await userEvent.click(screen.getByRole('button', { name: 'Copy array' }));

      expect(copyToClipboardMock).toHaveBeenCalledWith(
        JSON.stringify(['authentication', 'security'], null, 2)
      );
    });

    it('copies a single leaf value as its raw text', async () => {
      render(<JsonTreeViewer json={{ message: 'hello' }} />);

      await userEvent.click(screen.getByRole('button', { name: 'Copy value' }));

      expect(copyToClipboardMock).toHaveBeenCalledWith('hello');
    });

    it('confirms a copy in place by swapping the icon to a success check', async () => {
      render(<JsonTreeViewer json={{ user: { name: 'Alice' } }} />);
      const button = screen.getByRole('button', { name: 'Copy object' });
      expect(button.querySelector('[data-euiicon-type="copy"]')).toBeInTheDocument();

      await userEvent.click(button);

      expect(button.querySelector('[data-euiicon-type="check"]')).toBeInTheDocument();
      expect(button.querySelector('[data-euiicon-type="copy"]')).not.toBeInTheDocument();
    });

    it('does not expand the collection when its copy button is clicked', async () => {
      render(<JsonTreeViewer json={{ user: { name: 'Alice' } }} />);

      await userEvent.click(screen.getByRole('button', { name: 'Copy object' }));

      // `user` starts collapsed; copying the subtree must not toggle it open.
      expect(screen.queryByText('"Alice"')).not.toBeInTheDocument();
      expect(screen.getByRole('treeitem', { name: /user/i })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });
  });

  // A host can pass `formatValue` to render a leaf's value — e.g. wrapping a query's matched terms
  // in `<mark>`. The tree keeps the raw value, so copy and in-table search keep working.
  describe('formatValue', () => {
    beforeEach(() => copyToClipboardMock.mockClear());

    // Marks a value that contains `term`, so the formatted output is distinguishable from raw text.
    const markMatch =
      (term: string): FormatValue =>
      ({ value }) =>
        typeof value === 'string' && value.includes(term) ? (
          <mark data-test-subj="fmt">{value}</mark>
        ) : undefined;

    it('renders a string through formatValue, keeping the JSON quotes and copyability', async () => {
      render(<JsonTreeViewer json={{ message: 'hello' }} formatValue={markMatch('ell')} />);

      // The formatted node is rendered…
      expect(screen.getByTestId('fmt')).toHaveTextContent('hello');
      // …still wrapped in the string's quotes (consistent styling)…
      expect(screen.getByRole('treeitem', { name: /message/i })).toHaveTextContent('"hello"');

      // …and the copy button works on the highlighted leaf, copying the RAW value.
      await userEvent.click(screen.getByRole('button', { name: 'Copy value' }));
      expect(copyToClipboardMock).toHaveBeenCalledWith('hello');
    });

    it('falls back to the default rendering when formatValue returns undefined', () => {
      render(<JsonTreeViewer json={{ message: 'hello' }} formatValue={markMatch('zzz')} />);

      expect(screen.queryByTestId('fmt')).not.toBeInTheDocument();
      expect(screen.getByText('"hello"')).toBeVisible();
    });

    it('auto-expands to a hidden match using the raw value even when formatValue transforms it', () => {
      render(
        <JsonTreeViewer
          json={{ user: { city: 'Berlin' } }}
          expandNodesContainingTerm="berl"
          formatValue={markMatch('Berlin')}
        />
      );

      // `user` was collapsed; the raw value still drives auto-expand and the match renders marked.
      expect(screen.getByTestId('fmt')).toHaveTextContent('Berlin');
    });
  });
});
