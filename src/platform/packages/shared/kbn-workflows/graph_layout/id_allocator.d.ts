export declare function slugify(name: string): string;
/**
 * Returns a unique slug per name. Collisions get a numeric suffix (`-2`, `-3`, …).
 *
 * Uses a `nextCounter` map so repeated duplicates probe from where the last
 * allocation left off rather than scanning from 2 each time — amortised O(1).
 */
export declare class IdAllocator {
    private usedIds;
    private nextCounter;
    allocate(name: string): string;
}
