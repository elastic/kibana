import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
export declare const getValidFilters: (dataView: DataView, filters: Filter[]) => Filter[];
