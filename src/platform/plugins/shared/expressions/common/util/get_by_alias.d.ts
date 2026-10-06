/**
 * This is used for looking up function/argument definitions. It looks through
 * the given object/array for a case-insensitive match, which could be either the
 * `name` itself, or something under the `aliases` property.
 */
export declare const ALL_NAMESPACES = "*";
interface Node {
    name?: string;
    aliases?: string[];
    namespace?: string;
}
export declare function getByAlias<T extends Node>(node: T[] | Record<string, T>, nodeName: string, nodeNamespace?: string): T | undefined;
export {};
