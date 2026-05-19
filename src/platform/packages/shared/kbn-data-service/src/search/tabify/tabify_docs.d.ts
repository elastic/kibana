import type { estypes } from '@elastic/elasticsearch';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
interface TabifyDocsOptions {
    shallow?: boolean;
    /**
     * If set to `false` the _source of the document, if requested, won't be
     * merged into the flattened document.
     */
    source?: boolean;
    /**
     * If set to `true` values that have been ignored in ES (ignored_field_values)
     * will be merged into the flattened document. This will only have an effect if
     * the `hit` has been retrieved using the `fields` option.
     */
    includeIgnoredValues?: boolean;
}
type Hit<T = unknown> = Partial<estypes.SearchHit<T>> & {
    ignored_field_values?: Record<string, unknown[]>;
};
/**
 * Flattens an individual hit (from an ES response) into an object. This will
 * create flattened field names, like `user.name`.
 *
 * @param hit The hit from an ES reponse's hits.hits[]
 * @param indexPattern The index pattern for the requested index if available.
 * @param params Parameters how to flatten the hit
 */
export declare function flattenHit(hit: Hit, indexPattern?: DataView, params?: TabifyDocsOptions & {
    flattenedFieldsComparator?: FlattenedFieldsComparator;
}): Record<string, any>;
export declare const getFlattenedFieldsComparator: (indexPattern?: DataView) => (a: string | symbol, b: string | symbol) => 1 | 0 | -1;
export type FlattenedFieldsComparator = ReturnType<typeof getFlattenedFieldsComparator>;
export declare const tabifyDocs: (esResponse: estypes.SearchResponse<unknown>, index?: DataView, params?: TabifyDocsOptions) => Datatable;
export {};
