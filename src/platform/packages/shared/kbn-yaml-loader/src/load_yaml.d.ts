/**
 * Loads the yaml package asynchronously. Use this in browser code to avoid
 * pulling the full yaml library into the initial bundle.
 * The returned promise resolves to the yaml module (parse, stringify, Document, etc.).
 */
export declare const loadYaml: () => Promise<typeof import("yaml")>;
