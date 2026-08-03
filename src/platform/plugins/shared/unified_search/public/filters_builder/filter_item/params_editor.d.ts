import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { Operator } from '../../filter_bar/filter_editor';
interface ParamsEditorProps {
    dataView: DataView;
    params: unknown;
    onHandleParamsChange: (params: Filter['meta']['params']) => void;
    onHandleParamsUpdate: (value: string) => void;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    field?: DataViewField;
    operator?: Operator;
}
export declare function ParamsEditor({ dataView, field, operator, params, onHandleParamsChange, onHandleParamsUpdate, timeRangeForSuggestionsOverride, filtersForSuggestions, }: ParamsEditorProps): React.JSX.Element;
export {};
