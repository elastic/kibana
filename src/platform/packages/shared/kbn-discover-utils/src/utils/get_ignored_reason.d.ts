import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewField } from '@kbn/data-views-plugin/public';
export declare enum IgnoredReason {
    IGNORE_ABOVE = "ignore_above",
    MALFORMED = "malformed",
    UNKNOWN = "unknown"
}
/**
 * Returns the reason why a specific field was ignored in the response.
 * Will return undefined if the field had no ignored values in it.
 * This implementation will make some assumptions based on specific types
 * of ignored values can only happen with specific field types in Elasticsearch.
 *
 * @param field Either the data view field or the string name of it.
 * @param ignoredFields The hit._ignored value of the hit to validate.
 */
export declare function getIgnoredReason(field: DataViewField | string, ignoredFields: SearchHit['_ignored']): IgnoredReason | undefined;
