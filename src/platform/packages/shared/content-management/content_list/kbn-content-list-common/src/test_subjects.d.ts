/**
 * Canonical `data-test-subj` values emitted by the `@kbn/content-list` UI
 * framework (table, toolbar, filters, selection bar, provider dialogs, layout).
 *
 * This is the single source of truth shared by the components that render these
 * subjects and the test helpers that target them. Cross-plugin suites drive
 * listing pages they don't own at run time, so a `TableListView` ->
 * `@kbn/content-list` migration in one plugin can break those suites if the
 * subjects drift — selective testing doesn't schedule them
 * (see {@link https://github.com/elastic/kibana/pull/270044}). Keeping the
 * literals here means a component and its consumers can't diverge silently.
 */
export declare const CONTENT_LIST_TEST_SUBJECTS: {
    readonly table: "content-list-table";
    readonly tableSkeleton: "content-list-table-skeleton";
    readonly itemLink: "content-list-table-item-link";
    readonly columnName: "content-list-table-column-name";
    readonly columnActions: "content-list-table-column-actions";
    readonly columnStarred: "content-list-table-column-starred";
    readonly columnUpdatedAt: "content-list-table-column-updatedAt";
    readonly columnCreatedBy: "content-list-table-column-createdBy";
    readonly actionEdit: "content-list-table-action-edit";
    readonly actionDelete: "content-list-table-action-delete";
    readonly actionInspect: "content-list-table-action-inspect";
    readonly createdByManaged: "content-list-createdBy-managed";
    readonly createdByNoCreator: "content-list-createdBy-noCreator";
    readonly createdByAvatar: "content-list-createdBy-avatar";
    readonly defaultEmptyState: "content-list-default-empty-state";
    readonly toolbar: "contentListToolbar";
    readonly toolbarSkeleton: "contentListToolbar-skeleton";
    readonly tagsFilter: "contentListTagsRenderer";
    readonly sortFilter: "contentListSortRenderer";
    readonly sortSelectOptions: "sortSelectOptions";
    readonly createdByFilter: "contentListCreatedByRenderer";
    readonly starredFilter: "contentListStarredRenderer";
    readonly selectionBar: "contentListSelectionBar";
    readonly deleteConfirmation: "contentListDeleteConfirmation";
    readonly deleteConfirmationCloseButton: "contentListDeleteConfirmation-closeButton";
    readonly deleteConfirmationSkippedCallout: "contentListDeleteConfirmation-skippedCallout";
    readonly deleteConfirmationSkippedList: "contentListDeleteConfirmation-skippedList";
    readonly deleteError: "contentListDeleteError";
};
/** Per-row subject for the table item with `id` (`itemId` on the table). */
export declare const getContentListRowSubj: (id: string) => string;
/**
 * Subject for a tag option in the tags filter popover, keyed by tag *name* to
 * match the legacy `TableListView` panel (`testSubjFriendly`) and the
 * `@kbn/content-list-scout` helper. The first space is replaced with `_`,
 * mirroring the legacy normalization so cross-plugin suites resolve the same
 * subject regardless of which framework an app has adopted.
 */
export declare const getContentListTagOptionSubj: (name: string) => string;
/**
 * Subjects the toolbar composes from its root `data-test-subj`. Defaults to
 * {@link CONTENT_LIST_TEST_SUBJECTS.toolbar}; pass a custom root when the
 * toolbar is rendered with an overridden `data-test-subj`.
 */
export declare const getContentListToolbarSubjects: (root?: string) => {
    readonly root: string;
    readonly searchBox: `${string}-searchBox`;
    readonly searchParseError: `${string}-searchParseError`;
    readonly selectionBar: `${string}-selectionBar`;
    readonly skeleton: `${string}-skeleton`;
};
/**
 * Subjects the selection bar composes from its root `data-test-subj`. Defaults
 * to {@link CONTENT_LIST_TEST_SUBJECTS.selectionBar}; the toolbar renders it
 * with `${toolbar}-selectionBar`, so its delete button resolves to
 * `contentListToolbar-selectionBar-deleteButton`.
 */
export declare const getContentListSelectionBarSubjects: (root?: string) => {
    readonly root: string;
    readonly deleteButton: `${string}-deleteButton`;
};
