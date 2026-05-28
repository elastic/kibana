type FilterFunc<P extends keyof T, T> = (item: T[P]) => boolean;
/**
 * Filters out a list by a given filter. This is currently used to implement:
 *   - fieldType filters a list of fields by their type property
 *   - aggFilter filters a list of aggs by their name property
 *
 * @returns the filter function which can be registered with angular
 */
export declare function propFilter<P extends string>(prop: P): <T extends { [key in P]: T[P]; }>(list: T[], filters?: string[] | string | FilterFunc<P, T>) => T[];
export {};
