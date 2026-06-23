import type { TypeOf } from '@kbn/config-schema';
/**
 * Schema defining the valid pricing product configurations.
 * Each product has a name and an associated tier that determines feature availability.
 *
 * @internal
 */
export declare const pricingProductsSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    name: "observability";
    tier: "complete" | "logs_essentials";
}> | Readonly<{} & {
    name: "ai_soc";
    tier: "search_ai_lake";
}> | Readonly<{} & {
    name: "security";
    tier: "complete" | "essentials" | "search_ai_lake";
}> | Readonly<{} & {
    name: "endpoint";
    tier: "complete" | "essentials" | "search_ai_lake";
}> | Readonly<{} & {
    name: "cloud";
    tier: "complete" | "essentials" | "search_ai_lake";
}>>;
/**
 * Represents a product with an associated pricing tier.
 * Used to determine feature availability based on the current pricing configuration.
 *
 * @public
 */
export type IPricingProduct = TypeOf<typeof pricingProductsSchema>;
/**
 * Schema defining the pricing tiers configuration structure.
 * Includes whether tiers are enabled and which products are active.
 *
 * @internal
 */
export declare const tiersConfigSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    products: import("@kbn/config-schema").Type<(Readonly<{} & {
        name: "observability";
        tier: "complete" | "logs_essentials";
    }> | Readonly<{} & {
        name: "ai_soc";
        tier: "search_ai_lake";
    }> | Readonly<{} & {
        name: "security";
        tier: "complete" | "essentials" | "search_ai_lake";
    }> | Readonly<{} & {
        name: "endpoint";
        tier: "complete" | "essentials" | "search_ai_lake";
    }> | Readonly<{} & {
        name: "cloud";
        tier: "complete" | "essentials" | "search_ai_lake";
    }>)[] | undefined>;
}>;
/**
 * Configuration for pricing tiers that determines feature availability.
 * When enabled, features are only available if they're associated with an active product.
 * When disabled, all features are considered available.
 *
 * @public
 */
export type TiersConfig = TypeOf<typeof tiersConfigSchema>;
