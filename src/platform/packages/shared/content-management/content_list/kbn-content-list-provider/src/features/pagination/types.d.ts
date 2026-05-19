/** Default number of items per page. */
export declare const DEFAULT_PAGE_SIZE = 20;
/** Default page size options shown in the pagination dropdown. */
export declare const DEFAULT_PAGE_SIZE_OPTIONS: number[];
/**
 * Pagination configuration.
 *
 * @example
 * ```ts
 * // Use defaults (page size 20, options [10, 20, 50, 100]).
 * features: { pagination: true }
 *
 * // Custom initial page size and options.
 * features: {
 *   pagination: {
 *     initialPageSize: 50,
 *     pageSizeOptions: [25, 50, 100],
 *   },
 * }
 *
 * // Disable pagination entirely.
 * features: { pagination: false }
 * ```
 */
export interface PaginationConfig {
    /** Initial number of items per page. Defaults to {@link DEFAULT_PAGE_SIZE}. */
    initialPageSize?: number;
    /** Available page size options. Defaults to {@link DEFAULT_PAGE_SIZE_OPTIONS}. */
    pageSizeOptions?: number[];
}
