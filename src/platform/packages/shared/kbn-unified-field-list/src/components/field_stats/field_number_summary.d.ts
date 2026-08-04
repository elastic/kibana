import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { NumberSummary } from '../../types';
export interface FieldNumberSummaryProps {
    dataView: DataView;
    field: DataViewField;
    numberSummary?: NumberSummary;
    'data-test-subj': string;
}
export declare const FieldNumberSummary: React.FC<FieldNumberSummaryProps>;
export declare function isNumberSummaryValid(numberSummary?: NumberSummary): boolean;
