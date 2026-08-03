/** Canonical string constants for each significance tier. Import these instead of raw strings
 *  to prevent key mismatches across consumers. */
export declare const PVALUE_IMPACT_LEVELS: {
    readonly HIGH: "high";
    readonly MODERATE: "moderate";
    readonly LOW: "low";
};
/** Significance tier derived from a change-point pvalue. Lower pvalue = more significant. */
export type PvalueImpactLevel = (typeof PVALUE_IMPACT_LEVELS)[keyof typeof PVALUE_IMPACT_LEVELS];
/** Maps a numeric pvalue to its significance tier. */
export declare const getPvalueImpactLevel: (pvalue: number) => PvalueImpactLevel;
/** EUI semantic colour token for each significance tier, matching the Discover results table. */
export declare const PVALUE_IMPACT_COLORS: Record<PvalueImpactLevel, string>;
export declare const formatPvalueLabel: (p: unknown) => string;
