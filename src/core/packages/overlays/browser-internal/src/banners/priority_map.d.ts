interface PriorityValue {
    readonly priority: number;
}
/**
 * Immutable map that ensures entries are always in descending order based on
 * the values 'priority' property.
 */
export declare class PriorityMap<K, V extends PriorityValue> implements Iterable<[K, V]> {
    private readonly map;
    constructor(map?: ReadonlyMap<K, V>);
    add(key: K, value: V): PriorityMap<K, V>;
    remove(key: K): PriorityMap<K, V>;
    has(key: K): boolean;
    [Symbol.iterator](): MapIterator<[K, V]>;
    values(): MapIterator<V>;
}
export {};
