import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { Operator } from '../../filter_bar/filter_editor';
export declare const strings: {
    getOperatorSelectPlaceholderSelectLabel: () => string;
};
interface OperatorInputProps<TParams = unknown> {
    field: DataViewField | undefined;
    operator: Operator | undefined;
    params: TParams;
    onHandleOperator: (operator: Operator, params?: TParams) => void;
}
export declare function OperatorInput<TParams = unknown>({ field, operator, params, onHandleOperator, }: OperatorInputProps<TParams>): React.JSX.Element;
export {};
