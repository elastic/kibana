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
import { ROOT_ID } from './tree_model';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));
const copyToClipboardMock = jest.mocked(copyToClipboard);

const rowTestId = (path: string) => `jsonTreeViewerRow-json-viewer-${path.split('.').join('__')}`;
const copyTestId = (path: string) => `jsonTreeViewerCopy-json-viewer-${path.split('.').join('__')}`;
const pagerTestId = (collectionId: string = ROOT_ID) => `jsonTreeViewerPager-${collectionId}`;
const moreTestId = (collectionId: string = ROOT_ID) => `jsonTreeViewerMore-${collectionId}`;
const fewerTestId = (collectionId: string = ROOT_ID) => `jsonTreeViewerFewer-${collectionId}`;

describe('JsonTreeViewer', () => {
  it('renders the top-level keys and values of an object', () => {
    render(<JsonTreeViewer json={{ message: 'hello', count: 5 }} />);

    expect(screen.getByTestId(rowTestId('message'))).toHaveTextContent('"hello"');
    expect(screen.getByTestId(rowTestId('count'))).toHaveTextContent('5');
  });

  // In-table search and virtual scrolling remounts every cell, which would collapse all nodes in the tree.
  // The host persists the state and seeds a fresh instance with it; these tests prove a remounted instance comes up already expanded.
  it('restores an expanded node on a fresh instance seeded with the persisted state', async () => {
    const doc = { user: { name: 'Alice', city: 'Berlin' } };
    let lastState: TreeExpansionState | undefined;

    const { unmount } = render(
      <JsonTreeViewer json={doc} onStateChange={(state) => (lastState = state)} />
    );

    // Collapsed: the nested value is not rendered.
    expect(screen.queryByTestId(rowTestId('user.name'))).not.toBeInTheDocument();

    // Expanding reveals the child and reports the new state to the host.
    await userEvent.click(screen.getByTestId(rowTestId('user')));
    expect(screen.getByTestId(rowTestId('user.name'))).toHaveTextContent('"Alice"');
    expect(lastState?.expanded.size).toBe(1);

    // A brand-new instance (as after a remount) seeded with that state is already expanded.
    unmount();
    render(<JsonTreeViewer json={doc} initialState={lastState} />);
    expect(screen.getByTestId(rowTestId('user.name'))).toHaveTextContent('"Alice"');
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
    expect(screen.queryByTestId(rowTestId('field_11'))).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId(moreTestId()));
    expect(screen.getByTestId(rowTestId('field_11'))).toHaveTextContent('"value_11"');
    expect(lastState?.revealed.size).toBe(1);

    // A fresh instance seeded with that state keeps the revealed field visible.
    unmount();
    render(<JsonTreeViewer json={doc} initialState={lastState} />);
    expect(screen.getByTestId(rowTestId('field_11'))).toHaveTextContent('"value_11"');
  });

  it('shows "Show more" and "Show fewer" pagination buttons', async () => {
    // 25 fields: after one "show more" (10 → 20) five stay hidden AND it is past the cap, so both
    // buttons are displayed.
    const doc = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`field_${i}`, i]));
    render(<JsonTreeViewer json={doc} />);

    // At the initial cap only "Show more" is offered.
    expect(screen.queryByTestId(fewerTestId())).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId(moreTestId()));

    // Both affordances now live inside the one pager row (same line).
    const pager = screen.getByTestId(pagerTestId());
    expect(within(pager).getByTestId(moreTestId())).toBeVisible();
    const showFewer = within(pager).getByTestId(fewerTestId());
    expect(showFewer).toBeVisible();

    // "Show fewer" collapses the list back to the initial cap, leaving only "Show more".
    // Focus must stay in the pager (the clicked button unmounts).
    await userEvent.click(showFewer);
    expect(screen.queryByTestId(fewerTestId())).not.toBeInTheDocument();
    expect(screen.getByTestId(moreTestId())).toBeVisible();
    expect(pager).toHaveFocus();
  });

  describe('keyboard navigation', () => {
    it('steps from a leaf row into its copy-value button with ArrowRight', async () => {
      render(<JsonTreeViewer json={{ message: 'hello' }} />);

      screen.getByTestId(rowTestId('message')).focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(screen.getByTestId(copyTestId('message'))).toHaveFocus();
    });

    it('steps from a pager row into its first button with ArrowRight', async () => {
      // 12 fields capped at 10 renders a "Show 2 more fields" pager row.
      const doc = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`field_${i}`, i]));
      render(<JsonTreeViewer json={doc} />);

      screen.getByTestId(pagerTestId()).focus();
      await userEvent.keyboard('{ArrowRight}');

      expect(screen.getByTestId(moreTestId())).toHaveFocus();
    });

    it('moves between the two pager buttons with the Right and Left arrows', async () => {
      // 25 fields: after one reveal the pager row shows both "Show 5 more" and "Show fewer".
      const doc = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`field_${i}`, i]));
      render(<JsonTreeViewer json={doc} />);
      await userEvent.click(screen.getByTestId(moreTestId()));

      const showMore = screen.getByTestId(moreTestId());
      const showFewer = screen.getByTestId(fewerTestId());
      const pagerRow = screen.getByTestId(pagerTestId());

      pagerRow.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(showMore).toHaveFocus();

      await userEvent.keyboard('{ArrowRight}');
      expect(showFewer).toHaveFocus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(showMore).toHaveFocus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(pagerRow).toHaveFocus();
    });

    it('steps from the first row up to the Expand all control with ArrowUp', async () => {
      render(<JsonTreeViewer json={{ user: { city: 'Berlin' } }} />);

      // `user` is a collapsed collection, so it is the first (and only) visible row.
      screen.getByTestId(rowTestId('user')).focus();
      await userEvent.keyboard('{ArrowUp}');

      expect(screen.getByTestId('jsonTreeViewerExpandAll')).toHaveFocus();
    });
  });

  describe('Auto expand nodes that contain a search match', () => {
    const doc = { user: { city: 'Berlin' }, org: { name: 'Acme' } };

    it('expands a collapsed container so a hidden match renders, leaving non-matches collapsed', () => {
      render(<JsonTreeViewer json={doc} expandNodesContainingTerm="berl" />);
      expect(screen.getByTestId(rowTestId('user.city'))).toHaveTextContent('"Berlin"');
      // `org` has no match and stays collapsed.
      expect(screen.queryByTestId(rowTestId('org.name'))).not.toBeInTheDocument();
    });

    it('does not auto-expand anything without a search term', () => {
      render(<JsonTreeViewer json={doc} />);
      expect(screen.queryByTestId(rowTestId('user.city'))).not.toBeInTheDocument();
      expect(screen.queryByTestId(rowTestId('org.name'))).not.toBeInTheDocument();
    });

    it('reveals a nested match hidden past the collection pager budget', () => {
      // `logs` has 15 fields; the match sits at index 12, past the 10-child cap.
      const nestedDoc = {
        logs: Object.fromEntries(
          Array.from({ length: 15 }, (_, i) => [`field_${i}`, i === 12 ? 'needle' : `other_${i}`])
        ),
      };
      render(<JsonTreeViewer json={nestedDoc} expandNodesContainingTerm="needle" />);

      expect(screen.getByTestId(rowTestId('logs.field_12'))).toHaveTextContent('"needle"');
    });
  });

  describe('copying values and subtrees', () => {
    beforeEach(() => copyToClipboardMock.mockClear());

    it('copies a collapsed object subtree as pretty-printed JSON', async () => {
      render(<JsonTreeViewer json={{ user: { name: 'Alice', city: 'Berlin' } }} />);

      await userEvent.click(screen.getByTestId(copyTestId('user')));

      expect(copyToClipboardMock).toHaveBeenCalledWith(
        JSON.stringify({ name: 'Alice', city: 'Berlin' }, null, 2)
      );
    });

    it('copies an array subtree as pretty-printed JSON', async () => {
      render(<JsonTreeViewer json={{ tags: ['authentication', 'security'] }} />);

      await userEvent.click(screen.getByTestId(copyTestId('tags')));

      expect(copyToClipboardMock).toHaveBeenCalledWith(
        JSON.stringify(['authentication', 'security'], null, 2)
      );
    });

    it('copies a single leaf value as its raw text', async () => {
      render(<JsonTreeViewer json={{ message: 'hello' }} />);

      await userEvent.click(screen.getByTestId(copyTestId('message')));

      expect(copyToClipboardMock).toHaveBeenCalledWith('hello');
    });

    it('confirms a copy in place by swapping the icon to a success check', async () => {
      render(<JsonTreeViewer json={{ user: { name: 'Alice' } }} />);
      const button = screen.getByTestId(copyTestId('user'));
      expect(button.querySelector('[data-euiicon-type="copy"]')).toBeInTheDocument();

      await userEvent.click(button);

      expect(button.querySelector('[data-euiicon-type="check"]')).toBeInTheDocument();
      expect(button.querySelector('[data-euiicon-type="copy"]')).not.toBeInTheDocument();
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

      expect(screen.getByTestId('fmt')).toHaveTextContent('hello');
      expect(screen.getByTestId(rowTestId('message'))).toHaveTextContent('"hello"');

      await userEvent.click(screen.getByTestId(copyTestId('message')));
      expect(copyToClipboardMock).toHaveBeenCalledWith('hello');
    });

    it('falls back to the default rendering when formatValue returns undefined', () => {
      render(<JsonTreeViewer json={{ message: 'hello' }} formatValue={markMatch('zzz')} />);

      expect(screen.queryByTestId('fmt')).not.toBeInTheDocument();
      expect(screen.getByTestId(rowTestId('message'))).toHaveTextContent('"hello"');
    });

    it('auto-expands to a hidden match using the raw value even when formatValue transforms it', () => {
      render(
        <JsonTreeViewer
          json={{ user: { city: 'Berlin' } }}
          expandNodesContainingTerm="berl"
          formatValue={markMatch('Berlin')}
        />
      );

      expect(screen.getByTestId('fmt')).toHaveTextContent('Berlin');
    });
  });
});
