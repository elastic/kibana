import type { SavedObjectsCollectMultiNamespaceReferencesPurpose } from '@kbn/core-saved-objects-api-server/src/apis';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
interface ObjectOrigin {
    /** The object's type. */
    type: string;
    /** The object's ID. */
    id: string;
    /** The object's origin is its `originId` field */
    origin: string | undefined;
}
/**
 * Fetches all objects with a shared origin, returning a map of the matching aliases and what space(s) they exist in.
 *
 * @internal
 */
export declare function findSharedOriginObjects(createPointInTimeFinder: CreatePointInTimeFinderFn, objects: ObjectOrigin[], perPage?: number, purpose?: SavedObjectsCollectMultiNamespaceReferencesPurpose): Promise<Map<string, Set<string>>>;
export {};
