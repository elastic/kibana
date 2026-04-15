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
import { waitForItems, openCreatedByPopover, setSearch, searchValue } from './play_helpers';

/**
 * Created By filter interaction tests.
 *
 * Covers: avatar rendering, popover open/close, include/exclude via popover
 * and table avatars, active count badge, clear button, fuzzy search-bar
 * `createdBy` clauses, alphabetical sort order, Ctrl+click exclude from the
 * popover, multi-select OR logic, and the `referencedFields` gate that
 * prevents filtering on a bare `createdBy:` clause with no value.
 */
export const testCreatedByInteractions = async ({ canvas, body, step }: PlayContext) => {
  await waitForItems(canvas);

  // ── 1. Created By column renders creator avatars ──────────────────────
  await step('Created By column renders creator avatars', async () => {
    await waitFor(
      () => {
        const avatars = canvas.getAllByTestId('content-list-createdBy-avatar');
        expect(avatars.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );
  });

  // ── 2. Created By filter button is present in the toolbar ─────────────
  await step('Created By filter button is present', async () => {
    const createdByButton = canvas.getByTestId('contentListCreatedByRenderer');
    expect(createdByButton).toBeInTheDocument();
    expect(createdByButton).toHaveTextContent('Created by');
  });

  // ── 3. Clicking the button opens the filter popover ───────────────────
  await step('Opens the Created By filter popover on click', async () => {
    await openCreatedByPopover(canvas, body);
  });

  // ── 4. Popover lists available users ──────────────────────────────────
  await step('Popover lists available users with avatars', async () => {
    await waitFor(() => {
      expect(body.getByTestId('createdBy-searchbar-option-u_665722084_cloud')).toBeInTheDocument();
      expect(body.getByTestId('createdBy-searchbar-option-u_admin_local')).toBeInTheDocument();
      expect(body.getByTestId('createdBy-searchbar-option-u_jane_doe')).toBeInTheDocument();
      expect(body.getByText('Cloud User')).toBeInTheDocument();
      expect(body.getByText('Admin Local')).toBeInTheDocument();
      expect(body.getByText('Jane Doe')).toBeInTheDocument();
    });
  });

  // ── 5. Selecting a user applies an include filter ─────────────────────
  await step('Selecting Cloud User applies a createdBy include filter', async () => {
    await userEvent.click(body.getByTestId('createdBy-searchbar-option-u_665722084_cloud'));

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('createdBy:');
    });
  });

  // ── 6. Filter button shows active count badge ─────────────────────────
  await step('Filter button shows active count badge', async () => {
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(canvas.getByTestId('contentListCreatedByRenderer')).toHaveTextContent('1');
    });
  });

  // ── 7. Clear filter button removes the active filter ──────────────────
  await step('Clear filter removes the active createdBy filter', async () => {
    await openCreatedByPopover(canvas, body);

    await waitFor(() => {
      expect(body.getByTestId('contentListCreatedByRenderer-clear')).toBeInTheDocument();
    });

    await userEvent.click(body.getByTestId('contentListCreatedByRenderer-clear'));

    await waitFor(() => {
      expect(searchValue(canvas)).toBe('');
    });
  });

  // ── 8. Clicking a table avatar applies a createdBy filter ─────────────
  await step('Clicking a table row avatar applies a createdBy include filter', async () => {
    await userEvent.keyboard('{Escape}');

    await waitFor(
      () =>
        expect(canvas.getAllByTestId('content-list-createdBy-avatar').length).toBeGreaterThan(0),
      { timeout: 5000 }
    );
    const firstAvatar = canvas.getAllByTestId('content-list-createdBy-avatar')[0];
    await userEvent.click(firstAvatar);

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('createdBy:');
    });
  });

  // ── 9. Cmd/Ctrl+click a table avatar applies an exclude filter ────────
  await step('Cmd/Ctrl+click on a table row avatar applies an exclude filter', async () => {
    await setSearch(canvas, '');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(searchValue(canvas)).toBe(''));

    await waitFor(
      () =>
        expect(canvas.getAllByTestId('content-list-createdBy-avatar').length).toBeGreaterThan(0),
      { timeout: 5000 }
    );
    const firstAvatar = canvas.getAllByTestId('content-list-createdBy-avatar')[0];
    fireEvent.click(firstAvatar, { metaKey: true, ctrlKey: true });

    await waitFor(() => {
      expect(searchValue(canvas)).toMatch(/createdBy:/);
    });
  });

  // ── 10. createdBy:j shows only Jane Doe and John Smith rows ───────────
  await step('createdBy:j shows only Jane Doe and John Smith rows', async () => {
    await setSearch(canvas, 'createdBy:j');

    await waitFor(
      () => {
        expect(
          canvas.getAllByLabelText(/^Filter by creator: (Jane Doe|John Smith)$/).length
        ).toBeGreaterThan(0);
        expect(canvas.queryAllByLabelText('Filter by creator: Cloud User')).toHaveLength(0);
        expect(canvas.queryAllByLabelText('Filter by creator: Admin Local')).toHaveLength(0);
        expect(canvas.queryAllByLabelText('Filter by creator: Data Analyst')).toHaveLength(0);
      },
      { timeout: 5000 }
    );
  });

  // ── 11. -createdBy:j omits Jane Doe and John Smith rows ──────────────
  await step('-createdBy:j omits Jane Doe and John Smith rows', async () => {
    await setSearch(canvas, '-createdBy:j');

    await waitFor(
      () => {
        expect(canvas.queryAllByLabelText('Filter by creator: Jane Doe')).toHaveLength(0);
        expect(canvas.queryAllByLabelText('Filter by creator: John Smith')).toHaveLength(0);
        expect(
          canvas.getAllByLabelText(/^Filter by creator: (Cloud User|Admin Local|Data Analyst)$/)
            .length
        ).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );
  });

  // ── 12. Popover options are sorted alphabetically by display name ────────
  await step('Created By popover options are sorted alphabetically', async () => {
    await openCreatedByPopover(canvas, body);

    await waitFor(() => {
      const list = body.getByTestId('contentListCreatedByRenderer-list');
      const options = within(list).getAllByRole('option');
      const labels = options.map((o) => o.textContent?.trim() ?? '');
      // Labels may include count suffixes (e.g. "Admin Local 6"); extract just the name part.
      const names = labels.map((l) => l.replace(/\s+\d+$/, '').trim());
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });

    await userEvent.keyboard('{Escape}');
  });

  // ── 13. Ctrl+click on a popover option applies a createdBy exclude ─────
  await step('Ctrl+click on a popover option applies a createdBy exclude filter', async () => {
    await openCreatedByPopover(canvas, body);

    const list = body.getByTestId('contentListCreatedByRenderer-list');
    const cloudOption = within(list).getByTestId('createdBy-searchbar-option-u_665722084_cloud');
    fireEvent.mouseDown(cloudOption, { ctrlKey: true, metaKey: true });
    fireEvent.click(cloudOption, { ctrlKey: true, metaKey: true });

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('-createdBy:');
    });

    await userEvent.keyboard('{Escape}');

    await waitFor(
      () => {
        // Items remain after the exclude.
        expect(canvas.getAllByTestId('content-list-table-item-link').length).toBeGreaterThan(0);
        // No Cloud User avatars appear in the visible rows.
        expect(canvas.queryAllByLabelText('Filter by creator: Cloud User')).toHaveLength(0);
      },
      { timeout: 5000 }
    );

    await setSearch(canvas, '');
  });

  // ── 14. Multiple createdBy selections apply OR logic ───────────────────
  await step('Two createdBy includes apply OR logic (union of creators)', async () => {
    await openCreatedByPopover(canvas, body);

    const list = body.getByTestId('contentListCreatedByRenderer-list');
    await userEvent.click(within(list).getByTestId('createdBy-searchbar-option-u_jane_doe'));
    await userEvent.click(within(list).getByTestId('createdBy-searchbar-option-u_john_smith'));

    await userEvent.keyboard('{Escape}');

    await waitFor(
      () => {
        expect(canvas.getAllByTestId('content-list-table-item-link').length).toBeGreaterThan(0);
        // Items from both selected creators appear in the results.
        expect(canvas.queryAllByLabelText('Filter by creator: Jane Doe')).not.toHaveLength(0);
        expect(canvas.queryAllByLabelText('Filter by creator: John Smith')).not.toHaveLength(0);
        // No other creators appear.
        expect(canvas.queryAllByLabelText('Filter by creator: Cloud User')).toHaveLength(0);
        expect(canvas.queryAllByLabelText('Filter by creator: Admin Local')).toHaveLength(0);
      },
      { timeout: 5000 }
    );

    await setSearch(canvas, '');
  });

  // ── 15. Bare `createdBy:` shows no active filter badge ──────────────────
  //
  // A bare `createdBy:` clause (no value — the state EUI autocomplete inserts)
  // is not a fully-qualified filter. `referencedFields` requires a non-empty
  // value in the AST clause before priming fires, so no filter is committed to
  // the query model and the filter button badge stays at zero.
  await step('Bare createdBy: clause shows no active filter badge', async () => {
    // Simulate EUI autocomplete inserting "createdBy:" without a value.
    await setSearch(canvas, 'createdBy:');

    await waitFor(() => {
      // The filter button must carry no active-filter badge.
      const btn = canvas.getByTestId('contentListCreatedByRenderer');
      expect(btn).not.toHaveTextContent(/^[1-9]/);
    });

    await setSearch(canvas, '');
  });

  // ── 16. Managed avatar is rendered in the table ──────────────────────────
  await step('Managed avatar is rendered in the Created By column', async () => {
    await waitForItems(canvas);
    await waitFor(
      () => {
        const managedAvatars = canvas.getAllByTestId('content-list-createdBy-managed');
        expect(managedAvatars.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );
  });

  // ── 17. No Creator avatar is rendered in the table ──────────────────────
  await step('No Creator avatar is rendered in the Created By column', async () => {
    await waitForItems(canvas);
    await waitFor(
      () => {
        const noCreatorAvatars = canvas.getAllByTestId('content-list-createdBy-noCreator');
        expect(noCreatorAvatars.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );
  });

  // ── 18. Clicking a Managed avatar applies a createdBy filter ────────────
  await step('Clicking a Managed avatar applies a createdBy include filter', async () => {
    await waitFor(
      () =>
        expect(canvas.getAllByTestId('content-list-createdBy-managed').length).toBeGreaterThan(0),
      { timeout: 5000 }
    );
    const managedAvatar = canvas.getAllByTestId('content-list-createdBy-managed')[0];
    await userEvent.click(managedAvatar);

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('createdBy:(Managed)');
    });

    await setSearch(canvas, '');
  });

  // ── 19. Clicking a No Creator avatar applies a createdBy filter ─────────
  await step('Clicking a No Creator avatar applies a createdBy include filter', async () => {
    await waitFor(
      () =>
        expect(canvas.getAllByTestId('content-list-createdBy-noCreator').length).toBeGreaterThan(0),
      { timeout: 5000 }
    );
    const noCreatorAvatar = canvas.getAllByTestId('content-list-createdBy-noCreator')[0];
    await userEvent.click(noCreatorAvatar);

    await waitFor(() => {
      expect(searchValue(canvas)).toMatch(/createdBy:\(?"?No creator"?\)?/);
    });

    await setSearch(canvas, '');
  });

  // ── 20. Popover lists Managed and No Creator options ────────────────────
  await step('Created By popover lists Managed and No Creator options', async () => {
    await openCreatedByPopover(canvas, body);

    await waitFor(() => {
      expect(body.getByTestId('createdBy-searchbar-option-__managed__')).toBeInTheDocument();
      expect(body.getByTestId('createdBy-searchbar-option-__no_creator__')).toBeInTheDocument();
    });

    await userEvent.keyboard('{Escape}');
  });

  // ── 21. Selecting Managed in popover filters to managed items ───────────
  await step('Selecting Managed in popover applies a createdBy filter', async () => {
    await openCreatedByPopover(canvas, body);
    await userEvent.click(body.getByTestId('createdBy-searchbar-option-__managed__'));
    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(searchValue(canvas)).toContain('createdBy:(Managed)');
    });

    await setSearch(canvas, '');
  });

  // Reset search so the next module starts from a clean state.
  await setSearch(canvas, '');
};
