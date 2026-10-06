import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { type FilterOperatorLiteral } from '../../../../../../utils/filter_input_codec';
export interface FilterInput {
    tagName: string;
    operator: FilterOperatorLiteral;
    tagValue: string[] | string | undefined;
}
interface FilterSelectionInputProps {
    form: UseFormReturn<FilterInput>;
    onFilterInputChanged: (filterInput: FilterInput) => void;
    /**
     * Business-rule validator invoked by RHF on submit (and on revalidation).
     * Return `true` when valid, or an error message string when invalid.
     * May be async when validating against the server.
     */
    validateExpression: (input: FilterInput) => true | string | Promise<true | string>;
    getFilteringDimensionsOptions: () => string[];
    getFilterValuesOptions: (anchor: Omit<Partial<FilterInput>, 'tagValue'>) => string[];
}
export declare function FilterSelectionInput({ form, onFilterInputChanged, validateExpression, getFilteringDimensionsOptions, getFilterValuesOptions, }: FilterSelectionInputProps): React.JSX.Element;
export {};
