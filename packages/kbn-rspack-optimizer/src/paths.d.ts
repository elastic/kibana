/** Relative path from outputRoot to the unified RSPack bundle output directory. */
export declare const BUNDLES_SUBDIR = "target/public/bundles";
/** Relative path from outputRoot to the temporary entry wrapper directory. */
export declare const ENTRY_WRAPPERS_SUBDIR = "target/.rspack-entry-wrappers";
export declare const METRICS_FILENAME = "metrics.json";
export declare const CHUNK_MANIFEST_FILENAME = "chunk-manifest.json";
export declare const STATS_FILENAME = "stats.json";
/** Resolve the absolute path to the RSPack bundles output directory. */
export declare const resolveBundlesDir: (outputRoot: string) => string;
/** Resolve the absolute path to the entry wrappers directory. */
export declare const resolveEntryWrappersDir: (outputRoot: string) => string;
