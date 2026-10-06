export declare const PLUGIN_ID = "customIntegrations";
export declare const PLUGIN_NAME = "customIntegrations";
/**
 * A map of category names and their corresponding titles.
 */
export declare const INTEGRATION_CATEGORY_DISPLAY: {
    [key: string]: {
        title: string;
        parent_id?: string;
    };
};
export declare const FEATURED_INTEGRATIONS_BY_CATEGORY: {
    security: string[];
    '': string[];
};
/**
 * A category applicable to an Integration.
 */
export type IntegrationCategory = string;
/**
 * The list of all available categories.
 */
export declare const category: IntegrationCategory[];
/**
 * An object containing the id of an `IntegrationCategory` and the count of all Integrations in that category.
 */
export interface IntegrationCategoryCount {
    count: number;
    id: IntegrationCategory;
}
/**
 * A map of shipper names and their corresponding titles.
 */
export declare const SHIPPER_DISPLAY: {
    beats: string;
    search: string;
    language_clients: string;
    other: string;
    sample_data: string;
    tests: string;
    tutorial: string;
    placeholders: string;
};
/**
 * A shipper-- an internal or external system capable of storing data in ES/Kibana-- applicable to an Integration.
 */
export type Shipper = keyof typeof SHIPPER_DISPLAY;
/**
 * The list of all known shippers.
 */
export declare const shipper: Shipper[];
/**
 * An icon representing an Integration.
 */
export interface CustomIntegrationIcon {
    src: string;
    type: 'eui' | 'svg';
}
/**
 * A definition of a dataintegration, which can be registered with Kibana.
 */
export interface CustomIntegration {
    id: string;
    title: string;
    description: string;
    type: 'ui_link';
    uiInternalPath: string;
    uiExternalLink?: string;
    isBeta: boolean;
    icons: CustomIntegrationIcon[];
    categories: IntegrationCategory[];
    shipper: Shipper;
    eprOverlap?: string;
}
export declare const ROUTES_APPEND_CUSTOM_INTEGRATIONS = "/internal/customIntegrations/appendCustomIntegrations";
export declare const ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS = "/internal/customIntegrations/replacementCustomIntegrations";
