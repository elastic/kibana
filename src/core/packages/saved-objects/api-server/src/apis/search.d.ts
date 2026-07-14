import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsRawDocSource } from '../..';
/**
 * Options for the saved objects raw search operation.
 *
 * This interface extends the Elasticsearch `SearchRequest` type and allows using
 * the full Elasticsearch query DSL, including aggregations.
 *
 * @remarks
 * **Security Warning for Aggregations:** Some Elasticsearch aggregations can return data from
 * documents that did not match the query, potentially bypassing security restrictions like
 * Kibana Spaces. The following aggregation patterns are problematic and **should be avoided**:
 *
 * - **`terms` with `min_doc_count: 0`**: Can return terms from the index that are not in matching documents,
 *   potentially exposing data from other spaces or unauthorized documents.
 * - **`global`**: Ignores your search filter and collects data from all documents in the index.
 * - **`significant_terms`**: Uses a background set for comparisons that by default includes all documents in the index.
 * - **`significant_text`**: Similar to `significant_terms`, uses background document set.
 * - **`parent`**: Accesses parent documents which may not match filters.
 * - **`nested`** / **`reverse_nested`**: May access nested documents outside the currentquery scope.
 *
 * When authoring aggregations, ensure you only use aggregation types and configurations that
 * operate strictly within the scope of documents matching the query.
 *
 * @public
 */
export interface SavedObjectsSearchOptions extends Omit<estypes.SearchRequest, 'index'> {
    /** The type or types of objects to find. */
    type: string | string[];
    /** The namespaces to search within. */
    namespaces: string[];
}
/**
 * Response from the saved objects raw search operation.
 */
export type SavedObjectsSearchResponse<Document extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, Aggregations = unknown> = estypes.SearchResponse<Document, Aggregations>;
