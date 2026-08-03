export declare function extractExportDetails(blob: Blob): Promise<SavedObjectsExportResultDetails | undefined>;
export interface SavedObjectsExportResultDetails {
    exportedCount: number;
    missingRefCount: number;
    missingReferences: Array<{
        id: string;
        type: string;
    }>;
    excludedObjectsCount: number;
    excludedObjects: Array<{
        id: string;
        type: string;
        reason?: string;
    }>;
}
