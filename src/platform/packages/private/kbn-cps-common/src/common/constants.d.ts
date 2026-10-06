/**
 * Project routing constants for Cross-project search
 * These are stored as strings in saved objects to explicitly override parent values
 */
export declare const PROJECT_ROUTING: {
    /** Search across all linked projects */
    readonly ALL: '_alias:*';
    /** Search only the origin project */
    readonly ORIGIN: '_alias:_origin';
};
export type ProjectRoutingValue = (typeof PROJECT_ROUTING)[keyof typeof PROJECT_ROUTING];
/**
 * Returns `true` when the provided value represents a non-default project
 * routing expression (i.e. anything other than `_alias:*` or undefined).
 *
 * An explicitly stored `_alias:*` is treated as "default" because it is
 * functionally equivalent to having no NPRE configured — the server already
 * coalesces a missing NPRE to `_alias:*` when returning a space.
 */
export declare const isCustomProjectRouting: (value: string | undefined) => boolean;
