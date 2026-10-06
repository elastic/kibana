import type { PricingProductFeature } from '@kbn/core-pricing-common';
/**
 * Identifier of the pricing feature that gates cross-project search (CPS)
 * configuration UI such as the space-default project routing section.
 */
export declare const CPS_TIER_ELIGIBLE_FEATURE_ID = "cps:tierEligible";
/**
 * Pricing feature that marks a project as eligible for cross-project search
 * (CPS) configuration. When this feature is available for the active product
 * tier, the spaces management UI exposes the project routing controls.
 *
 * CPS availability by solution:
 * - Observability and Security: Complete tier only.
 * - Elasticsearch (ES3) and VectorDB: all projects.
 *
 * The `products` list below only needs to enumerate the solutions that gate CPS
 * behind a specific tier (Observability and Security, both `complete`). ES3 and
 * VectorDB projects do not participate in the pricing tier system
 * (`pricing.tiers.enabled` is `false`), so `isFeatureAvailable` returns `true`
 * for them and the section is shown on every project of those types. The same
 * is true for traditional (non-serverless) builds where tiers are inactive.
 *
 * Security exposes multiple product lines (security/endpoint/cloud) that all
 * share the active tier, so listing each of them at `complete` ensures the
 * feature resolves as available for any Complete-tier Security project via the
 * `some()` match in `PricingTiersClient.isFeatureAvailable`.
 */
export declare const CPS_TIER_ELIGIBLE_FEATURE: PricingProductFeature;
