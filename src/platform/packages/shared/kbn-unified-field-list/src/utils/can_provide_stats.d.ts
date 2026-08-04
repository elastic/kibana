import type { DataViewField } from '@kbn/data-views-plugin/common';
export declare function canProvideStatsForField(field: DataViewField, isEsqlQuery: boolean): boolean;
export declare function canProvideAggregatedStatsForField(field: DataViewField, isEsqlQuery: boolean): boolean;
export declare function canProvideNumberSummaryForField(field: DataViewField, isEsqlQuery: boolean): boolean;
export declare function canProvideExamplesForField(field: DataViewField, isEsqlQuery: boolean): boolean;
export declare function canProvideStatsForEsqlField(field: DataViewField): boolean;
