import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { type AsCodeDataView } from '@kbn/as-code-data-views-schema';
import type { AsCodeSavedDataView } from '@kbn/as-code-data-views-schema/src/types';
export declare function toStoredDataView(dataView: AsCodeDataView): string | DataViewSpec;
export declare function toStoredDataView(dataView: AsCodeSavedDataView): DataViewSpec;
