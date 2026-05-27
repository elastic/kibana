/**
 * Project routing constants for Cross-project search
 * These are stored as strings in saved objects to explicitly override parent values
 */
export declare const PROJECT_ROUTING: {
    /** Search across all linked projects */
    readonly ALL: "_alias:*";
    /** Search only the origin project */
    readonly ORIGIN: "_alias:_origin";
};
export type ProjectRoutingValue = (typeof PROJECT_ROUTING)[keyof typeof PROJECT_ROUTING];
