/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { userEvent, waitFor, expect, fireEvent } from '@storybook/test';
import type { PlayContext } from './play_helpers';
import { waitForItems, setSearch, searchValue } from './play_helpers';

/**
 * Tag badge interaction tests (clicks on badges rendered in the Name column).
 *
 * Covers: badge click → include filter, Ctrl+click badge → exclude filter.
 */
export const testTagBadgeInteractions = async ({ canvas, step }: PlayContext) => {
  await waitForItems(canvas);

  // ── 18. Tag badge in Name column applies a tag filter ─────────────────
  await step('Clicking a tag badge applies a tag include filter', async () => {
    // Search for "Uptime" to guarantee Production-tagged rows are on screen
    // regardless of the current page size or page index.
    await setSearch(canvas, 'Uptime');

    await waitFor(
      () => {
        // data-test-subj for a tag badge is "tag-{tagId}".
        // For id="tag-production" → "tag-tag-production".
        expect(canvas.getAllByTestId('tag-tag-production').length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    await userEvent.click(canvas.getAllByTestId('tag-tag-production')[0]);

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

  // ── 25. Tag badge — Ctrl+click applies an exclude filter ──────────────
  await step('Ctrl+click on a tag badge applies a tag exclude filter', async () => {
    // Search for "APM" to bring APM Service Map rows — each carrying an
    // Archived tag badge — onto the screen.
    await setSearch(canvas, 'APM');

    await waitFor(
      () => {
        expect(canvas.getAllByTestId('tag-tag-archived').length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // TagBadge reads metaKey/ctrlKey directly from the click event (no mousedown capture).
    fireEvent.click(canvas.getAllByTestId('tag-tag-archived')[0], {
      ctrlKey: true,
      metaKey: true,
    });

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('-tag:');
    });

    await waitFor(
      () => {
        // text:"APM" AND -tag:(Archived) — every APM Service Map variant has the
        // Archived tag, so all are excluded and no items remain.
        expect(canvas.queryAllByTestId('content-list-table-item-link')).toHaveLength(0);
      },
      { timeout: 5000 }
    );
  });

  // Reset search so the next module starts from a clean state.
  await setSearch(canvas, '');
};
