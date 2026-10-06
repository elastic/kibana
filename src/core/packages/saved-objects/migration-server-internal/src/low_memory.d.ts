/**
 * The heap size limit (in bytes) below which a Kibana instance is considered
 * memory-constrained for the purpose of saved object migrations.
 *
 * Instances configured with a heap of 1GB or less are the ones observed to OOM
 * or time out while replaying bulk writes during ECH upgrades, so we make the
 * migration back off to reduce its peak memory usage.
 */
export declare const LOW_MEMORY_HEAP_SIZE_LIMIT_BYTES: number;
/**
 * The bulk-write batch size to use on memory-constrained instances.
 *
 * Lowering the batch size reduces the number of documents that are held in
 * memory at any given time (the read batch, the transformed batch and the bulk
 * operation body), trading a longer migration for a lower memory footprint.
 */
export declare const LOW_MEMORY_BATCH_SIZE = 100;
/**
 * Returns `true` when the current Node.js process is running with a heap size
 * limit small enough that saved object migrations should back off (run
 * sequentially with a reduced batch size) to lower their peak memory usage.
 *
 * @param heapSizeLimit The heap size limit in bytes. Defaults to the limit
 * reported by V8 for the current process (reflects `--max-old-space-size`).
 */
export declare const isMemoryConstrained: (heapSizeLimit?: number) => boolean;
