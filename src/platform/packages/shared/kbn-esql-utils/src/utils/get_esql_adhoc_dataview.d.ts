import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core/public';
/**
 * Creates an ad-hoc DataView for ES|QL queries.
 *
 * Some applications need to have a DataView to work properly with ES|QL queries.
 * This helper creates an ad-hoc DataView with an ID constructed from the index pattern.
 * Since there are no runtime fields, field formatters, or default time fields,
 * the same ad-hoc DataView can be constructed/reused, which solves caching issues
 * described in https://github.com/elastic/kibana/issues/168131.
 *
 * The function automatically detects the time field by making an HTTP request to determine
 * if '@timestamp' exists across all indices in the query. If all indices contain the field,
 * it sets '@timestamp' as the time field; otherwise, no time field is set.
 *
 * @param dataViewsService - The DataViews service instance used to create the DataView
 * @param query - The ES|QL query string to extract the index pattern from
 * @param options - Optional configuration for DataView creation
 * @param options.allowNoIndex - Whether to allow creating a DataView for non-existent indices
 * @param options.skipFetchFields - Whether to skip fetching fields for performance reasons
 * @param options.createNewInstanceEvenIfCachedOneAvailable - Forces creation of a new instance by clearing the cached DataView instance and cached time field lookup for the query
 * @param options.id - Explicit DataView ID. When provided, this ID is used as-is instead of generating one via SHA-256. Useful when the caller already knows the ID (e.g. from a persisted ad-hoc DataView spec) and wants the DataViewService cache to be populated under that exact key.
 * @param options.idPrefix - Custom prefix for the DataView ID (defaults to 'esql'). Use a different prefix to avoid cache collisions between consumers.
 * @param http - Optional HTTP service for fetching time field information. If not provided, no time field detection is performed
 *
 * @returns Promise that resolves to the created DataView with the detected time field (if any)
 *
 */
export declare function getESQLAdHocDataview({ dataViewsService, query, options, http, }: {
    dataViewsService: DataViewsPublicPluginStart;
    query: string;
    options?: {
        allowNoIndex?: boolean;
        createNewInstanceEvenIfCachedOneAvailable?: boolean;
        skipFetchFields?: boolean;
        id?: string;
        idPrefix?: string;
    };
    http?: HttpStart;
}): Promise<import("@kbn/data-views-plugin/public").DataView>;
/**
 * Gets an initial index for a default ES|QL query by querying both local and remote (CCS) indices.
 * Could be used during onboarding when data views to get a better index are not yet available.
 * Can be used in combination with {@link getESQLAdHocDataview} to create a dataview for the index.
 *
 * Prefers a local `logs*` pattern if any local index starts with "logs",
 * otherwise returns the first available non-hidden index (local or remote).
 */
export declare function getIndexForESQLQuery(deps: {
    http: HttpStart;
}): Promise<string | null>;
