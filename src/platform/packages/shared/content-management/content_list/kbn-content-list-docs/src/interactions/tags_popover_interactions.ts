/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within, userEvent, waitFor, expect, fireEvent } from '@storybook/test';
import type { PlayContext } from './play_helpers';
import { waitForItems, openTagsPopover, setSearch, searchValue } from './play_helpers';

/**
 * Tags filter popover interaction tests.
 *
 * Covers: popover rendering, tag include selection, active count badge,
 * clear button, Ctrl+click exclude, and multi-tag OR logic.
 */
export const testTagsPopoverInteractions = async ({ canvas, body, step }: PlayContext) => {
  await waitForItems(canvas);

  // ── 15. Tags filter — popover lists available tags ─────────────────────
  await step('Tags filter popover lists available tags with colored badges', async () => {
    await openTagsPopover(canvas, body);

    const tagList = body.getByTestId('contentListTagsRenderer-list');
    expect(within(tagList).getByTestId('tag-searchbar-option-tag-production')).toBeInTheDocument();
    expect(within(tagList).getByTestId('tag-searchbar-option-tag-important')).toBeInTheDocument();
    expect(within(tagList).getByTestId('tag-searchbar-option-tag-development')).toBeInTheDocument();
    expect(within(tagList).getByText('Production')).toBeInTheDocument();
    expect(within(tagList).getByText('Important')).toBeInTheDocument();
  });

  // ── 16. Selecting a tag applies a tag include filter ──────────────────
  await step('Selecting Production filters to only Production-tagged items', async () => {
    const tagList = body.getByTestId('contentListTagsRenderer-list');
    await userEvent.click(within(tagList).getByRole('option', { name: /Production/ }));

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('tag:');
    });

    await waitFor(
      () => {
        const items = canvas.getAllByTestId('content-list-table-item-link');
        expect(items.length).toBeGreaterThan(0);
        // Every visible item carries the Production tag badge.
        expect(canvas.getAllByTestId('tag-tag-production').length).toBe(items.length);
      },
      { timeout: 5000 }
    );
  });

  // ── 17. Tags filter — active count badge and clear button ─────────────
  await step('Active count badge and clear button work correctly', async () => {
    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(canvas.getByTestId('contentListTagsRenderer')).toHaveTextContent('1');
    });

    await openTagsPopover(canvas, body);

    await waitFor(() => {
      expect(body.getByTestId('contentListTagsRenderer-clear')).toBeInTheDocument();
    });

    await userEvent.click(body.getByTestId('contentListTagsRenderer-clear'));

    await waitFor(() => {
      expect(searchValue(canvas)).toBe('');
    });
  });

  // ── 23. Tags filter — Ctrl+click in popover applies an exclude filter ─
  await step('Ctrl+click applies a tag exclude filter', async () => {
    await userEvent.keyboard('{Escape}');
    await waitForItems(canvas);

    await openTagsPopover(canvas, body);

    // SelectableFilterPopover captures the modifier key in onMouseDownCapture;
    // we must fire mousedown (to set the ref) then click (to trigger onChange).
    // Pass both ctrlKey and metaKey to handle macOS (metaKey) and other platforms (ctrlKey).
    const tagList = body.getByTestId('contentListTagsRenderer-list');
    const archivedOption = within(tagList).getByRole('option', { name: /Archived/ });
    fireEvent.mouseDown(archivedOption, { ctrlKey: true, metaKey: true });
    fireEvent.click(archivedOption, { ctrlKey: true, metaKey: true });

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('-tag:');
    });

    await userEvent.keyboard('{Escape}');

    await waitFor(
      () => {
        // Items remain visible after the exclude.
        expect(canvas.getAllByTestId('content-list-table-item-link').length).toBeGreaterThan(0);
        // No Archived tag badge appears on the visible page.
        expect(canvas.queryAllByTestId('tag-tag-archived')).toHaveLength(0);
      },
      { timeout: 5000 }
    );
  });

  // ── 24. Tags filter — two includes apply OR logic ─────────────────────
  await step('Two tag includes apply OR logic', async () => {
    await setSearch(canvas, '');

    await openTagsPopover(canvas, body);

    const tagList = body.getByTestId('contentListTagsRenderer-list');
    // "Development" tag: [Flights] Global Flight Dashboard, ML Anomaly Explorer.
    // "Important"  tag: [eCommerce] Revenue Dashboard, ML Anomaly Explorer.
    // Union (OR)       : [Flights], ML Anomaly Explorer, [eCommerce].
    await userEvent.click(within(tagList).getByRole('option', { name: /Development/ }));
    await userEvent.click(within(tagList).getByRole('option', { name: /Important/ }));

    await userEvent.keyboard('{Escape}');

    await waitFor(
      () => {
        const items = canvas.getAllByTestId('content-list-table-item-link');
        expect(items.length).toBeGreaterThan(0);
        // Both Development and Important badges appear in the filtered results (OR union).
        expect(canvas.queryAllByTestId('tag-tag-development').length).toBeGreaterThan(0);
        expect(canvas.queryAllByTestId('tag-tag-important').length).toBeGreaterThan(0);
        // Items with only non-matching tags (e.g. Archived) should not appear.
        expect(canvas.queryAllByTestId('tag-tag-archived')).toHaveLength(0);
      },
      { timeout: 5000 }
    );
  });

  // Reset search so the next module starts from a clean state.
  await setSearch(canvas, '');
};
