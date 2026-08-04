import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import type { Operator } from '../../filter_bar/filter_editor';
export declare const strings: {
    getSelectFieldPlaceholderLabel: () => string;
    getSelectOperatorPlaceholderLabel: () => string;
};
export interface ParamsEditorInputProps {
    dataView: DataView;
    params: unknown;
    onParamsChange: (params: unknown) => void;
    onParamsUpdate: (value: unknown) => void;
    timeRangeForSuggestionsOverride?: boolean;
    filtersForSuggestions?: Filter[];
    field?: DataViewField;
    operator?: Operator;
    invalid: boolean;
    disabled: boolean;
    suggestionsAbstraction?: SuggestionsAbstraction;
}
export declare function ParamsEditorInput({ dataView, field, operator, params, invalid, disabled, onParamsChange, onParamsUpdate, timeRangeForSuggestionsOverride, filtersForSuggestions, suggestionsAbstraction, }: ParamsEditorInputProps): React.JSX.Element | null;
