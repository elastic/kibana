/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within, userEvent, waitFor, expect } from '@storybook/test';
import type { PlayContext } from './play_helpers';
import {
  waitForItems,
  openTagsPopover,
  openCreatedByPopover,
  setSearch,
  searchValue,
} from './play_helpers';

/**
 * Combined filter and free-text search interaction tests.
 *
 * Covers: free-text title search, tag include + createdBy include (AND logic),
 * and starred flag + tag include (AND logic).
 */
export const testCombinedFilterInteractions = async ({ canvas, body, step }: PlayContext) => {
  await waitForItems(canvas);

  // ── 22. Free text search filters items by title ───────────────────────
  await step('Free text search filters items by title', async () => {
    await setSearch(canvas, 'APM');

    await waitFor(
      () => {
        const links = canvas.getAllByTestId('content-list-table-item-link');
        expect(links.length).toBeGreaterThan(0);
        // Every visible item title must contain the search term (case-insensitive).
        links.forEach((link) => {
          expect(link.textContent?.toLowerCase()).toContain('apm');
        });
      },
      { timeout: 5000 }
    );
  });

  // ── 26. Combined filters — tag include + createdBy include (AND) ──────
  await step('Tag include + createdBy include narrows to items matching both (AND)', async () => {
    await setSearch(canvas, '');

    // ① Tag include: Production.
    await openTagsPopover(canvas, body);
    const tagList = body.getByTestId('contentListTagsRenderer-list');
    await userEvent.click(within(tagList).getByRole('option', { name: /Production/ }));
    await userEvent.keyboard('{Escape}');

    // After tag filter only: only Production-tagged items are visible.
    await waitFor(
      () => {
        const items = canvas.getAllByTestId('content-list-table-item-link');
        expect(items.length).toBeGreaterThan(0);
        // Every visible item carries the Production tag badge.
        expect(canvas.getAllByTestId('tag-tag-production').length).toBe(items.length);
      },
      { timeout: 5000 }
    );

    const tagOnlyCount = canvas.getAllByTestId('content-list-table-item-link').length;

    // ② createdBy include: Cloud User (uid u_665722084_cloud).
    await openCreatedByPopover(canvas, body);
    await userEvent.click(body.getByTestId('createdBy-searchbar-option-u_665722084_cloud'));
    await userEvent.keyboard('{Escape}');

    // AND logic: adding createdBy narrows the set further.
    await waitFor(
      () => {
        const items = canvas.getAllByTestId('content-list-table-item-link');
        expect(items.length).toBeGreaterThan(0);
        // Fewer items than with the tag filter alone.
        expect(items.length).toBeLessThan(tagOnlyCount);
        // Every remaining item still carries the Production tag badge.
        expect(canvas.getAllByTestId('tag-tag-production').length).toBe(items.length);
        // Every visible avatar belongs to the selected creator.
        const avatars = canvas.getAllByTestId('content-list-createdBy-avatar');
        avatars.forEach((avatar) => {
          expect(avatar).toHaveAttribute('aria-label', 'Filter by creator: Cloud User');
        });
      },
      { timeout: 5000 }
    );
  });

  // ── 27. Combined filters — starred flag + tag include (AND) ─────────
  await step('Starred flag + tag include narrows to items matching both (AND)', async () => {
    await setSearch(canvas, '');
    await waitForItems(canvas);

    // Star items within this step so the test is self-contained and doesn't
    // depend on accumulated state from prior steps. Each starred row
    // contributes 2 unfavoriteButton elements (Column.Starred + Column.Name),
    // so we need at least 2 starred items (≥4 buttons) for the AND-narrowing
    // assertion below.  We also need "APM Service Map" (which carries the
    // Archived tag) to be starred for the tag intersection to have results.
    //
    // Items are sorted by title asc, so APM Service Map is the first row.
    // If it's already starred (from step 12), its button shows
    // `unfavoriteButton`; otherwise `favoriteButton`. Handle both cases by
    // checking the first row and starring it if needed, then starring
    // additional rows until we have enough.

    // Star items one at a time until we have at least 4 unfavoriteButton
    // elements (2 starred items × 2 button locations each).
    while (canvas.queryAllByTestId('unfavoriteButton').length < 4) {
      const starBtns = canvas.queryAllByTestId('favoriteButton');
      if (starBtns.length === 0) {
        break;
      }
      const countBefore = canvas.queryAllByTestId('unfavoriteButton').length;
      await userEvent.click(starBtns[0]);
      await waitFor(
        () => {
          expect(canvas.getAllByTestId('unfavoriteButton').length).toBeGreaterThan(countBefore);
        },
        { timeout: 5000 }
      );
    }

    expect(canvas.getAllByTestId('unfavoriteButton').length).toBeGreaterThanOrEqual(4);

    // Apply starred filter via the toolbar toggle.
    await userEvent.click(canvas.getByTestId('contentListStarredRenderer'));

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('is:starred');
    });

    await waitFor(
      () => {
        expect(canvas.getAllByTestId('content-list-table-item-link').length).toBeGreaterThanOrEqual(
          2
        );
      },
      { timeout: 5000 }
    );

    const starredCount = canvas.getAllByTestId('content-list-table-item-link').length;

    // Layer on the Archived tag filter. Only "APM Service Map" carries this
    // tag, so AND logic should narrow the starred set down.
    await openTagsPopover(canvas, body);
    const tagList = body.getByTestId('contentListTagsRenderer-list');
    await userEvent.click(within(tagList).getByRole('option', { name: /Archived/ }));
    await userEvent.keyboard('{Escape}');

    await waitFor(
      () => {
        const combinedItems = canvas.getAllByTestId('content-list-table-item-link');
        expect(combinedItems.length).toBeGreaterThan(0);
        expect(combinedItems.length).toBeLessThan(starredCount);
        expect(canvas.getAllByTestId('tag-tag-archived').length).toBe(combinedItems.length);
      },
      { timeout: 5000 }
    );
  });
};
