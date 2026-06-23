/**
 * Constant for the Kibana Observability solution.
 */
export declare const KIBANA_OBSERVABILITY_SOLUTION: "observability";
/**
 * Constant for the Kibana Security solution.
 */
export declare const KIBANA_SECURITY_SOLUTION: "security";
/**
 * Constant for the Kibana Search solution.
 */
export declare const KIBANA_SEARCH_SOLUTION: "search";
/**
 * Constant for the Kibana Workplace AI solution.
 */
export declare const KIBANA_WORKPLACE_AI_SOLUTION: "workplaceai";
/**
 * Constant for the Kibana Vectordb solution.
 */
export declare const KIBANA_VECTORDB_SOLUTION: "vectordb";
/**
 * A list of all Kibana solutions.
 */
export declare const KIBANA_SOLUTIONS: readonly ["observability", "security", "search", "workplaceai", "vectordb"];
/**
 * A type that defines the existing solutions.
 */
export type KibanaSolution = (typeof KIBANA_SOLUTIONS)[number];
/**
 * Complete tier for Observability solution.
 */
export declare const KIBANA_OBSERVABILITY_COMPLETE_TIER: "complete";
/**
 * Logs Essentials tier for Observability solution.
 */
export declare const KIBANA_OBSERVABILITY_LOGS_ESSENTIALS_TIER: "logs_essentials";
/**
 * Complete tier for Security solution.
 */
export declare const KIBANA_SECURITY_COMPLETE_TIER: "complete";
/**
 * Essentials tier for Security solution.
 */
export declare const KIBANA_SECURITY_ESSENTIALS_TIER: "essentials";
/**
 * Search AI Lake tier for Security solution.
 */
export declare const KIBANA_SECURITY_SEARCH_AI_LAKE_TIER: "search_ai_lake";
/**
 * Possible product tiers for Kibana solutions.
 */
export declare const KIBANA_PRODUCT_TIERS: {
    readonly observability: readonly ["complete", "logs_essentials"];
    readonly security: readonly ["complete", "essentials", "search_ai_lake"];
    readonly search: readonly [];
    readonly workplaceai: readonly [];
    readonly vectordb: readonly [];
};
/**
 * Existing product tiers for all Kibana solutions.
 */
export type KibanaProductTier = (typeof KIBANA_PRODUCT_TIERS)[KibanaSolution][number];
