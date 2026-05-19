import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
interface FindLegacyUrlAliasesObject {
    type: string;
    id: string;
}
/**
 * Fetches all legacy URL aliases that match the given objects, returning a map of the matching aliases and what space(s) they exist in.
 *
 * @internal
 */
export declare function findLegacyUrlAliases(createPointInTimeFinder: CreatePointInTimeFinderFn, objects: FindLegacyUrlAliasesObject[], perPage?: number): Promise<Map<string, Set<string>>>;
export {};
