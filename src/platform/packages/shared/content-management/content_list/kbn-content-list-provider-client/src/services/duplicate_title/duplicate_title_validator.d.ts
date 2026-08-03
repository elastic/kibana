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
export declare const createDuplicateTitleValidator: ({ findCurrentTitle, checkForDuplicate, getDuplicateTitleWarning, }: DuplicateTitleValidatorOptions) => TitleValidator;
