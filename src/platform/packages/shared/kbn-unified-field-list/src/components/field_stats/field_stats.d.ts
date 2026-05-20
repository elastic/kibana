import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { Query, Filter, AggregateQuery } from '@kbn/es-query';
import type { OverrideFieldTopValueBarCallback } from './field_top_values_bucket';
import type { BucketedAggregation, NumberSummary } from '../../types';
import type { AddFieldFilterHandler } from '../../types';
export interface FieldStatsState {
    isLoading: boolean;
    totalDocuments?: number;
    sampledDocuments?: number;
    sampledValues?: number;
    histogram?: BucketedAggregation<number | string | boolean>;
    topValues?: BucketedAggregation<number | string | boolean>;
    numberSummary?: NumberSummary;
}
export interface FieldStatsServices {
    uiSettings: IUiSettingsClient;
    dataViews: DataViewsContract;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    charts: ChartsPluginSetup;
}
interface FieldStatsPropsBase {
    services: FieldStatsServices;
    /** ISO formatted date string **/
    fromDate: string;
    /** ISO formatted date string **/
    toDate: string;
    dataViewOrDataViewId: DataView | string;
    field: DataViewField;
    color?: string;
    'data-test-subj'?: string;
    overrideMissingContent?: (params: {
        element: JSX.Element;
        reason: 'no-data' | 'unsupported';
    }) => JSX.Element | null;
    overrideFooter?: (params: {
        element: JSX.Element;
        totalDocuments?: number;
        sampledDocuments?: number;
    }) => JSX.Element;
    onAddFilter?: AddFieldFilterHandler;
    overrideFieldTopValueBar?: OverrideFieldTopValueBarCallback;
    onStateChange?: (s: FieldStatsState) => void;
}
export interface FieldStatsWithKbnQuery extends FieldStatsPropsBase {
    /** If Kibana-supported query is provided, it will be converted to dsl query **/
    query: Query | AggregateQuery;
    filters: Filter[];
    dslQuery?: never;
}
export interface FieldStatsWithDslQuery extends FieldStatsPropsBase {
    query?: never;
    filters?: never;
    /** If dsl query is provided, use it directly in searches **/
    dslQuery: object;
}
export type FieldStatsProps = FieldStatsWithKbnQuery | FieldStatsWithDslQuery;
/**
 * Component which fetches and renders stats for a data view field
 * @param props
 * @constructor
 */
declare const FieldStats: React.FC<FieldStatsProps>;
export default FieldStats;
