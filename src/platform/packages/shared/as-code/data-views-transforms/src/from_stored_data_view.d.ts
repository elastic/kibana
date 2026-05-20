import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { type AsCodeDataView } from '@kbn/as-code-data-views-schema';
/**
 * Convert a stored search-source `index` value (saved object / serialized search source)
 * to the as-code data view shape.
 *
 * @param index String id (referenced data view), inline {@link DataViewSpec}, or null/undefined
 * @returns As-code `data_source` object for classic (KQL/Lucene) tabs
 */
export declare function fromStoredDataView(index: string | DataViewSpec | null | undefined): AsCodeDataView;
