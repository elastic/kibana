/**
 * Load the YAML content of a bundled workflow example by its catalog ID.
 * Returns `undefined` if the ID is not in the allowlist or the file cannot be read.
 */
export declare function loadWorkflowExampleContent(entry: {
    id: string;
    filename: string;
}): Promise<string | undefined>;
