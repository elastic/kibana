/**
 * Constant for the Kibana Observability serverless project type.
 */
export declare const KIBANA_OBSERVABILITY_PROJECT: "oblt";
/**
 * Constant for the Kibana Security serverless project type.
 */
export declare const KIBANA_SECURITY_PROJECT: "security";
/**
 * Constant for the Kibana Search serverless project type.
 */
export declare const KIBANA_SEARCH_PROJECT: "es";
/**
 * Constant for the Kibana Workplace AI serverless project type.
 */
export declare const KIBANA_WORKPLACE_AI_PROJECT: "workplaceai";
/**
 * Constant for the Kibana Vectordb serverless project type.
 */
export declare const KIBANA_VECTORDB_PROJECT: "vectordb";
/**
 * A list of all Kibana serverless project types.
 */
export declare const KIBANA_PROJECTS: readonly ["oblt", "security", "es", "workplaceai", "vectordb"];
/**
 * A type that defines the existing serverless project types.
 */
export type KibanaProject = (typeof KIBANA_PROJECTS)[number];
