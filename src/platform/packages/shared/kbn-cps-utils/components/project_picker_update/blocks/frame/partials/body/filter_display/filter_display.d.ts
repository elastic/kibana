import React from 'react';
import type { FilterExpressionValue } from '../../../../../utils/filter_input_codec';
/**
 * Describes a filter that is being edited in the filter form.
 */
export interface EditingFilter {
    id: string;
    expression: FilterExpressionValue;
    enabled: boolean;
}
export interface ProjectPickerFilterDisplayProps {
    currentFilterInputId?: string;
    onEditFilter: (filter: Pick<EditingFilter, 'id' | 'expression'> | null) => void;
}
export declare function ProjectPickerFilterDisplay({ currentFilterInputId, onEditFilter, }: ProjectPickerFilterDisplayProps): React.JSX.Element | null;
