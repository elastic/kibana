import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
export interface FindSampleObjectsParams {
    client: SavedObjectsClientContract;
    logger: Logger;
    objects: SampleObject[];
}
export interface SampleObject {
    type: string;
    id: string;
}
export interface FindSampleObjectsResponseObject {
    type: string;
    id: string;
    /** Contains a string if this sample data object was found, or undefined if it was not. */
    foundObjectId: string | undefined;
}
/**
 * Given an array of objects in a sample dataset, this function attempts to find if those objects exist in the current space.
 * It attempts to find objects with an origin of the sample data (e.g., matching `id` or `originId`).
 */
export declare function findSampleObjects({ client, logger, objects }: FindSampleObjectsParams): Promise<FindSampleObjectsResponseObject[]>;
