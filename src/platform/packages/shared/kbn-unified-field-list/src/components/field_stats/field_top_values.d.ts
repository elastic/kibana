import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AddFieldFilterHandler, BucketedAggregation } from '../../types';
import type { OverrideFieldTopValueBarCallback } from './field_top_values_bucket';
export interface FieldTopValuesProps {
    areExamples: boolean | undefined;
    buckets: BucketedAggregation<number | string | boolean>['buckets'];
    dataView: DataView;
    field: DataViewField;
    sampledValuesCount: number;
    color: string;
    'data-test-subj': string;
    onAddFilter?: AddFieldFilterHandler;
    overrideFieldTopValueBar?: OverrideFieldTopValueBarCallback;
}
export declare const FieldTopValues: React.FC<FieldTopValuesProps>;
export declare const getDefaultColor: (euiThemeName: string) => string;
export declare const getFormattedPercentageValue: (currentValue: number, totalCount: number, digitsRequired: boolean) => string;
export declare const getProgressValue: (currentValue: number, totalCount: number) => number;
export declare const getBucketsValuesCount: (buckets?: BucketedAggregation<number | string | boolean>["buckets"]) => number;
export declare const getOtherCount: (bucketsValuesCount: number, sampledValuesCount: number) => number;
