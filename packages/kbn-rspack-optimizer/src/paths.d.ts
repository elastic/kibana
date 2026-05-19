/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Relative path from outputRoot to the unified RSPack bundle output directory. */
export declare const BUNDLES_SUBDIR = 'target/public/bundles';
/** Relative path from outputRoot to the temporary entry wrapper directory. */
export declare const ENTRY_WRAPPERS_SUBDIR = 'target/.rspack-entry-wrappers';
export declare const METRICS_FILENAME = 'metrics.json';
export declare const CHUNK_MANIFEST_FILENAME = 'chunk-manifest.json';
export declare const STATS_FILENAME = 'stats.json';
/** Resolve the absolute path to the RSPack bundles output directory. */
export declare const resolveBundlesDir: (outputRoot: string) => string;
/** Resolve the absolute path to the entry wrappers directory. */
export declare const resolveEntryWrappersDir: (outputRoot: string) => string;
