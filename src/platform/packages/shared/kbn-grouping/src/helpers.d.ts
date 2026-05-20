import type { GroupModel, GroupsById, Storage, GroupSettings } from './hooks/types';
import type { GroupingBucket, RawBucket } from './components';
/**
 * All mappings in Elasticsearch support arrays. They can also return null values or be missing. For example, a `keyword` mapping could return `null` or `[null]` or `[]` or `'hi'`, or `['hi', 'there']`. We need to handle these cases in order to avoid throwing an error.
 * When dealing with an value that comes from ES, wrap the underlying type in `ECSField`. For example, if you have a `keyword` or `text` value coming from ES, cast it to `ECSField<string>`.
 */
export type ECSField<T> = T | null | undefined | Array<T | null>;
/**
 * Return first non-null value. If the field contains an array, this will return the first value that isn't null. If the field isn't an array it'll be returned unless it's null.
 */
export declare function firstNonNullValue<T>(valueOrCollection: ECSField<T>): T | undefined;
export declare const defaultUnit: (n: number) => string;
export declare const LOCAL_STORAGE_GROUPING_KEY = "groups";
export declare const getAllGroupsInStorage: (storage: Storage) => GroupsById;
export declare const addGroupsToStorage: (storage: Storage, groupingId: string, group: GroupModel) => void;
/**
 * A type guard function that checks if a given value is a `RawBucket`.
 * It verifies that the value is an object with the required properties:
 * `key` and `doc_count`.
 *
 * @param bucket The value to check.
 * @returns `true` if the value is a `RawBucket`, `false` otherwise.
 */
export declare const isRawBucket: <T>(bucket: unknown) => bucket is RawBucket<T>;
/**
 * A type guard function that checks if a given bucket is a `GroupingBucket`.
 * It differentiates from a `RawBucket` by verifying the presence of the
 * `selectedGroup` property, which is unique to `GroupingBucket`.
 * Since `GroupingBucket` is derived from `RawBucket`, it first checks if
 * the bucket is a valid `RawBucket` before checking for `GroupingBucket`-specific properties.
 *
 * @param bucket The bucket to check.
 * @returns `true` if the bucket is a `GroupingBucket`, `false` otherwise.
 */
export declare const isGroupingBucket: <T>(bucket: unknown) => bucket is GroupingBucket<T>;
/**
 * Validates enforced groups configuration.
 * Throws an error if validation fails.
 * @param settings - GroupSettings that may contain enforcedGroups
 * @param maxGroupingLevels - Maximum allowed grouping levels
 * @throws Error if 'none' is in enforcedGroups, enforcedGroups are used with maxGroupingLevels === 1, or enforcedGroups.length > maxGroupingLevels
 */
export declare const validateEnforcedGroups: (settings: GroupSettings | undefined, maxGroupingLevels: number | undefined) => void;
/**
 * Ensures enforced groups are always included and placed in front of the selected groups array.
 * If only 'none' is selected, returns the enforced groups.
 * @param groups - Currently selected groups
 * @param enforced - Array of enforced group keys
 * @returns New array with enforced groups in front
 */
export declare const ensureEnforcedGroupsInFront: (groups: string[], enforced: string[]) => string[];
