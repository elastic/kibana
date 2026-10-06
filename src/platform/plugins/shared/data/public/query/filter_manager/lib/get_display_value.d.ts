import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, DataViewBase } from '@kbn/es-query';
export declare function getFieldDisplayValueFromFilter(filter: Filter, indexPatterns: DataView[] | DataViewBase[]): string;
export declare function getDisplayValueFromFilter(filter: Filter, indexPatterns: DataViewBase[]): string;
