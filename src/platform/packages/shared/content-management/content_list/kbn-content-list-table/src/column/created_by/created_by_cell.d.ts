import React from 'react';
/** Props for the {@link CreatedByCell} component. */
export interface CreatedByCellProps {
    /** The user ID (`uid`) of the item's creator. */
    createdBy?: string;
    /** Whether the item is system-managed (e.g. part of a package). */
    managed?: boolean;
}
/**
 * Cell renderer for `Column.CreatedBy`.
 *
 * Self-loading: uses `useProfile(uid)` which triggers a batched load if the
 * profile is not yet cached. Multiple cells mounting in the same frame get
 * their requests batched into a single `bulkResolve`.
 *
 * All avatar types are clickable: clicking toggles an include filter,
 * holding Cmd/Ctrl toggles exclude. Managed items use the `__managed__`
 * sentinel, items without a creator use `__no_creator__`, and regular
 * items filter by their UID.
 */
export declare const CreatedByCell: React.MemoExoticComponent<({ createdBy, managed }: CreatedByCellProps) => React.JSX.Element>;
