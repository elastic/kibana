import React from 'react';
import type { FormHook, RuntimePrimitiveTypes } from '../../shared_imports';
import type { Field } from '../../types';
import type { TypeSelection } from './types';
export interface FieldEditorFormState {
    isValid: boolean | undefined;
    isSubmitted: boolean;
    isSubmitting: boolean;
    submit: FormHook<Field>['submit'];
}
export interface FieldFormInternal extends Omit<Field, 'type' | 'internalType' | 'fields' | 'popularity'> {
    fields?: Record<string, {
        type: RuntimePrimitiveTypes;
    }>;
    type: TypeSelection;
    popularity?: string;
    __meta__: {
        isCustomLabelVisible: boolean;
        isCustomDescriptionVisible: boolean;
        isValueVisible: boolean;
        isFormatVisible: boolean;
        isPopularityVisible: boolean;
    };
}
export interface Props {
    /** Optional field to edit or preselected field to create */
    field?: Field;
    /** Handler to receive state changes updates */
    onChange?: (state: FieldEditorFormState) => void;
    /** Handler to receive update on the form "isModified" state */
    onFormModifiedChange?: (isModified: boolean) => void;
    /** If disabled, the field editor will not be editable */
    isDisabled?: boolean;
}
declare const FieldEditorComponent: ({ field, onChange, onFormModifiedChange, isDisabled }: Props) => React.JSX.Element;
export declare const FieldEditor: typeof FieldEditorComponent;
export {};
