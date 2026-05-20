/**
 * Utility class to manage virtual indexes of newly added rows (not yet saved).
 * This is needed to keep track of the correct position of new rows when multiple new rows are added/deleted.
 * And preserve the position where the user added them.
 */
export declare class RowsVirtualIndexes {
    private rowsVirtualIndexes;
    /**
     * If a new row is added before other new rows, their virtual indexes should be incremented.
     */
    addRowVirtualIndex(id: string, atIndex: number): void;
    /**
     * Updates virtual indexes after a row deletion.
     * If a row is deleted, all virtual indexes after it should be decremented by 1.
     */
    updateVirtualIndexesAfterDeletion(index: number): void;
    deleteVirtualIndexByRowId(id: string): void;
    clear(): void;
    getRowVirtualIndex(id: string): number | undefined;
}
