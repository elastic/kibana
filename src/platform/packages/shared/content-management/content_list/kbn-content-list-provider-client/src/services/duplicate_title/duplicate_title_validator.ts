/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/**
 * Shape of a single entry in
 * `OpenContentEditorParams['customValidators']['title']`.
 *
 * Re-declared locally to avoid importing the editor package's
 * `OpenContentEditorParams` (its `customValidators` is typed as a record of
 * arrays and would force the consumer to wrap this in another array).
 */
export interface TitleValidator {
  type: 'warning' | 'error';
  fn: (value: string, id: string) => Promise<string | undefined>;
}

/**
 * Options for {@link createDuplicateTitleValidator}.
 */
export interface DuplicateTitleValidatorOptions {
  /**
   * Lookup callback returning the current saved title for the item identified
   * by `id`, or `undefined` if the item cannot be found / is in an error
   * state. Used as `lastSavedTitle` so the consumer's check can ignore
   * "duplicates" against the item being edited.
   */
  findCurrentTitle: (id: string) => Promise<string | undefined>;
  /**
   * Returns `true` when the new title is valid (no duplicate exists). Throw
   * or resolve to `false` when a duplicate is detected.
   */
  checkForDuplicate: (args: {
    id: string;
    title: string;
    lastSavedTitle: string;
  }) => Promise<boolean | void>;
  /**
   * Optional formatter for the warning message. Defaults to a generic
   * "Saving \"{value}\" creates a duplicate title." string.
   */
  getDuplicateTitleWarning?: (value: string) => string;
}

const defaultDuplicateTitleWarning = (value: string): string =>
  i18n.translate('contentManagement.contentListProviderClient.duplicateTitleValidator.warning', {
    defaultMessage: 'Saving "{value}" creates a duplicate title.',
    values: { value },
  });

/**
 * Build a `customValidators.title` warning entry that flags duplicate titles
 * during inline editing in the content editor flyout.
 *
 * Bails when called without an `id` (new items haven't been persisted yet).
 * Bails when `findCurrentTitle` returns `undefined` (item not found / in
 * error state — leave validation to the save handler). Otherwise calls
 * `checkForDuplicate` and converts a `false` resolution or thrown error into
 * the warning string returned by `getDuplicateTitleWarning`. Unexpected errors
 * are logged to the console (dev only) and treated the same as a duplicate.
 *
 * @example
 * ```ts
 * const validator = createDuplicateTitleValidator({
 *   findCurrentTitle: async (id) => {
 *     const dashboard = await findService.findById(id);
 *     return dashboard.status === 'error' ? undefined : dashboard.attributes.title;
 *   },
 *   checkForDuplicate: ({ title, lastSavedTitle }) =>
 *     checkForDuplicateDashboardTitle({
 *       title,
 *       lastSavedTitle,
 *       copyOnSave: false,
 *       isTitleDuplicateConfirmed: false,
 *     }),
 *   getDuplicateTitleWarning: (value) =>
 *     dashboardListingErrorStrings.getDuplicateTitleWarning(value),
 * });
 *
 * <ContentListClientProvider
 *   contentEditor={{ customValidators: { title: [validator] } }}
 * />
 * ```
 */
export const createDuplicateTitleValidator = ({
  findCurrentTitle,
  checkForDuplicate,
  getDuplicateTitleWarning = defaultDuplicateTitleWarning,
}: DuplicateTitleValidatorOptions): TitleValidator => ({
  type: 'warning',
  fn: async (value, id) => {
    if (!id) {
      return undefined;
    }

    const lastSavedTitle = await findCurrentTitle(id);
    if (lastSavedTitle === undefined) {
      return undefined;
    }

    try {
      const ok = await checkForDuplicate({ id, title: value, lastSavedTitle });
      if (ok === false) {
        return getDuplicateTitleWarning(value);
      }
      return undefined;
    } catch (e) {
      // Some upstream check functions throw on duplicate rather than returning
      // `false`. Always return the formatted warning so non-duplicate errors
      // don't leak raw technical messages into the UI. Log any thrown value in
      // development so failures are visible regardless of `message` shape.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[createDuplicateTitleValidator] unexpected error during title check:', e);
      }
      return getDuplicateTitleWarning(value);
    }
  },
});
