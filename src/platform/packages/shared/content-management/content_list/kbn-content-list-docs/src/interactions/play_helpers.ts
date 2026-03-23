/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { within, userEvent, waitFor, expect, fireEvent } from '@storybook/test';

/**
 * Scoped query helpers returned by {@link createPlayContext}.
 *
 * Each interaction module receives this instead of raw `canvasElement` so
 * the setup (canvas / body scoping, step) is performed once.
 */
export interface PlayContext {
  canvas: ReturnType<typeof within>;
  body: ReturnType<typeof within>;
  step: (name: string, fn: () => Promise<void>) => void | Promise<void>;
}

/** Build a {@link PlayContext} from the Storybook play-function args. */
export const createPlayContext = ({
  canvasElement,
  step,
}: {
  canvasElement: HTMLElement;
  step: PlayContext['step'];
}): PlayContext => ({
  canvas: within(canvasElement),
  body: within(document.body),
  step,
});

// ---------------------------------------------------------------------------
// Reusable interaction helpers
// ---------------------------------------------------------------------------

/** Wait for the table to finish loading and render item links. */
export const waitForItems = async (canvas: PlayContext['canvas']) => {
  await waitFor(
    () => {
      expect(canvas.getAllByTestId('content-list-table-item-link').length).toBeGreaterThan(0);
    },
    { timeout: 5000 }
  );
};

/** Open the Tags filter popover and wait for it to render. */
export const openTagsPopover = async (canvas: PlayContext['canvas'], body: PlayContext['body']) => {
  await userEvent.click(canvas.getByTestId('contentListTagsRenderer'));
  await waitFor(() => {
    expect(body.getByTestId('contentListTagsRenderer-list')).toBeInTheDocument();
  });
};

/** Open the Created By filter popover and wait for it to render. */
export const openCreatedByPopover = async (
  canvas: PlayContext['canvas'],
  body: PlayContext['body']
) => {
  await userEvent.click(canvas.getByTestId('contentListCreatedByRenderer'));
  await waitFor(() => {
    expect(body.getByTestId('contentListCreatedByRenderer-list')).toBeInTheDocument();
  });
};

/** Set the search bar to a value using fireEvent (immediate, no keystrokes). */
export const setSearch = async (canvas: PlayContext['canvas'], value: string) => {
  const searchBar = canvas.getByTestId('contentListToolbar-searchBox');
  searchBar.focus();
  fireEvent.change(searchBar, { target: { value } });
  await waitFor(() => expect((searchBar as HTMLInputElement).value).toBe(value));
};

/** Read the current search bar value. */
export const searchValue = (canvas: PlayContext['canvas']): string =>
  (canvas.getByTestId('contentListToolbar-searchBox') as HTMLInputElement).value;
