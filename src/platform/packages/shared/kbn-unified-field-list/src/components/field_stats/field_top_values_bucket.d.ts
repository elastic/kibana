import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { AddFieldFilterHandler } from '../../types';
export interface FieldTopValuesBucketParams {
    field: DataViewField;
    fieldValue: unknown;
    formattedFieldValue?: string;
    formattedPercentage: string;
    progressValue: number;
    count: number;
    color: string;
    type?: 'normal' | 'other';
}
export type OverrideFieldTopValueBarCallback = (params: FieldTopValuesBucketParams) => Partial<FieldTopValuesBucketParams>;
export interface FieldTopValuesBucketProps extends FieldTopValuesBucketParams {
    'data-test-subj': string;
    onAddFilter?: AddFieldFilterHandler;
    /**
     * Optional callback to allow overriding props on bucket level
     */
    overrideFieldTopValueBar?: OverrideFieldTopValueBarCallback;
}
declare const FieldTopValuesBucket: React.FC<FieldTopValuesBucketProps>;
export default FieldTopValuesBucket;
