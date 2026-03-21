/**
 * Prefix of the workflows system indices.
 *
 * The Kibana system user has the same permission on those indices than it has on Kibana system indices.
 */
export declare const workflowSystemIndexPrefix = ".workflows-";
/**
 * Helper function to define workflow system indices.
 */
export declare const workflowSystemIndex: (suffix: string) => string;
