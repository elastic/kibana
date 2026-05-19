import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { type AsCodeDataView } from '@kbn/as-code-data-views-schema';
/**
 * Convert an as-code data view back to a stored search-source `index` value
 * (string id for a referenced data view, or inline {@link DataViewSpec} fields).
 *
 * @param dataView As-code `data_source` value from classic tab state
 * @returns Value suitable for `SerializedSearchSourceFields.index`
 */
export declare function toStoredDataView(dataView: AsCodeDataView): string | DataViewSpec;
