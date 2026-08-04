import React from 'react';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { type DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { UnifiedHistogramBreakdownContext } from '../../types';
export interface BreakdownFieldSelectorProps {
    dataView: DataView;
    breakdown: UnifiedHistogramBreakdownContext;
    esqlColumns?: DatatableColumn[];
    onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
    recommendedFields?: ReadonlyArray<string>;
    fieldsMetadata?: FieldsMetadataPublicStart;
}
export declare const BreakdownFieldSelector: ({ dataView, breakdown, esqlColumns, onBreakdownFieldChange, recommendedFields, fieldsMetadata, }: BreakdownFieldSelectorProps) => React.JSX.Element;
export default BreakdownFieldSelector;
