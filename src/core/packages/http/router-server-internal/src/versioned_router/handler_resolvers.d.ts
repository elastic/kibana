/**
 * Sort Kibana HTTP API versions from oldest to newest
 *
 * @example Given 'internal' versions ["1", "10", "2"] it will return ["1", "2", "10]
 * @example Given 'public' versions ["2023-01-01", "2002-10-10", "2005-01-01"] it will return ["2002-10-10", "2005-01-01", "2023-01-01"]
 */
export declare const sort: (versions: string[], access: "public" | "internal") => string[];
/**
 * Assumes that there is at least one version in the array.
 * @internal
 */
type Resolver = (versions: string[], access: 'public' | 'internal') => undefined | string;
export declare const resolvers: {
    sort: (versions: string[], access: "public" | "internal") => string[];
    oldest: Resolver;
    newest: Resolver;
    none: Resolver;
};
export {};
