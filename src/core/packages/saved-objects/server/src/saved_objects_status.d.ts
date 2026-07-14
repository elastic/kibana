/**
 * Meta information about the SavedObjectService's status. Available to plugins via {@link CoreSetup.status}.
 *
 * @public
 */
export interface SavedObjectStatusMeta {
    migratedIndices: {
        [status: string]: number;
        skipped: number;
        migrated: number;
    };
}
