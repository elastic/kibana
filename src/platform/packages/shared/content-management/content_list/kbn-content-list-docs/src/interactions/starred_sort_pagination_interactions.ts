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
import { waitForItems, searchValue } from './play_helpers';

/**
 * Starred, Sort, Pagination, and Delete interaction tests.
 *
 * Covers: star toggle, starred filter, sort change, pagination navigation,
 * and single-item delete with confirmation modal.
 */
export const testStarredSortPaginationInteractions = async ({
  canvas,
  body,
  step,
}: PlayContext) => {
  await waitForItems(canvas);

  // ── 12. Star icon toggles starred state ──────────────────────────────
  await step('Star icon toggle marks a row as starred', async () => {
    // Click the first row's star button. Sorted by title asc using Unicode
    // code-point order: uppercase letters (A=65) sort before '[' (91), so
    // "APM Service Map" is the first item, not "[eCommerce] Revenue Dashboard".
    const firstStarButton = canvas.getAllByTestId('favoriteButton')[0];
    await userEvent.click(firstStarButton);

    await waitFor(() => {
      // The story renders star buttons in two places per row: the dedicated
      // Column.Starred cell and inline inside Column.Name (showStarred).
      // Each starred row therefore contributes 2 "unfavoriteButton" elements.
      expect(canvas.getAllByTestId('unfavoriteButton').length).toBe(2);
    });
  });

  // ── 13. Starred filter shows only starred items ───────────────────────
  await step('Starred filter toggle shows only starred items', async () => {
    await userEvent.click(canvas.getByTestId('contentListStarredRenderer'));

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('is:starred');
    });

    await waitFor(
      () => {
        // Only the one starred item should appear.
        const links = canvas.getAllByTestId('content-list-table-item-link');
        expect(links.length).toBe(1);
        // Confirm it is the item we starred (unfavoriteButton visible).
        expect(canvas.getAllByTestId('unfavoriteButton').length).toBe(2);
      },
      { timeout: 5000 }
    );
  });

  // ── 14. Starred filter off restores all items ─────────────────────────
  await step('Toggling Starred filter off restores all items', async () => {
    await userEvent.click(canvas.getByTestId('contentListStarredRenderer'));

    await waitFor(() => {
      expect(searchValue(canvas)).toBe('');
    });

    await waitFor(
      () => {
        expect(canvas.getAllByTestId('content-list-table-item-link').length).toBeGreaterThan(1);
      },
      { timeout: 5000 }
    );
  });

  // ── 19. Sort — changing to "Recent-Old" updates the button label ──────
  await step('Changing sort to Recent-Old updates order', async () => {
    // Capture the first item before sorting so we can verify reordering.
    const firstItemBefore = canvas.getAllByTestId('content-list-table-item-link')[0].textContent;

    await userEvent.click(canvas.getByTestId('contentListSortRenderer'));

    await waitFor(() => {
      expect(body.getByTestId('sortSelectOptions')).toBeInTheDocument();
    });

    const sortList = body.getByTestId('sortSelectOptions');
    await userEvent.click(within(sortList).getByRole('option', { name: /Recent-Old/ }));

    await waitFor(
      () => {
        expect(canvas.getByTestId('contentListSortRenderer')).toHaveTextContent('Recent-Old');
        // The first visible item changed from the title-ascending order.
        const firstItemAfter = canvas.getAllByTestId('content-list-table-item-link')[0];
        expect(firstItemAfter.textContent).not.toBe(firstItemBefore);
      },
      { timeout: 5000 }
    );
  });

  // ── 20. Pagination — footer present; last page loads a different item set ─
  await step('Pagination footer navigates to the last page', async () => {
    const footer = canvas.getByTestId('contentListFooter');
    expect(footer).toBeInTheDocument();

    const pageButtons = within(footer).getAllByRole('button', { name: /Page \d/ });
    expect(pageButtons.length).toBeGreaterThan(1);
    await userEvent.click(pageButtons[pageButtons.length - 1]);

    await waitFor(
      () => {
        // The last page has fewer items than a full page (30 items / 20 per page).
        const lastPageItems = canvas.getAllByTestId('content-list-table-item-link');
        expect(lastPageItems.length).toBeGreaterThan(0);
        expect(lastPageItems.length).toBeLessThan(20);
      },
      { timeout: 5000 }
    );
  });

  // ── 21. Delete — single item delete with confirmation modal ───────────
  await step('Deleting an item opens a confirmation modal', async () => {
    // Use fireEvent.click to bypass EUI's hover-only visibility on the actions column.
    const deleteButtons = canvas.getAllByTestId('content-list-table-action-delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(body.getByTestId('contentListDeleteConfirmation')).toBeInTheDocument();
    });

    // EuiConfirmModal renders its confirm button with the standard EUI test ID.
    await userEvent.click(body.getByTestId('confirmModalConfirmButton'));

    await waitFor(
      () => {
        // The modal closes once the delete completes (story mock: 300 ms delay).
        expect(body.queryByTestId('contentListDeleteConfirmation')).not.toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
};
