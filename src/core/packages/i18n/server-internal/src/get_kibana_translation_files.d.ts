export declare const discoverAllTranslationPaths: (pluginPaths: string[]) => Promise<string[]>;
export declare const getKibanaTranslationFiles: (locale: string, pluginPaths: string[]) => Promise<string[]>;
export declare const getAllKibanaTranslationFiles: (pluginPaths: string[], supportedLocales: readonly string[]) => Promise<string[]>;
/**
 * Groups a flat list of translation file paths by locale code
 * (the filename without the .json extension).
 */
export declare const groupFilesByLocale: (files: string[]) => Record<string, string[]>;
/**
 * Hashes the raw bytes of a set of translation files without parsing them or
 * populating the loader cache. Files are sorted by path for determinism.
 * Returns a 12-character hex digest suitable for cache-busting URLs.
 */
export declare const computeLocaleFileHash: (files: string[]) => Promise<string>;
