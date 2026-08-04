import React from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import type { FieldOptionValue, FieldOption } from './types';
export interface FieldPickerProps<T extends FieldOptionValue> extends EuiComboBoxProps<FieldOption<T>['value']> {
    options: Array<FieldOption<T>>;
    activeField: EuiComboBoxOptionOption<FieldOption<T>['value']> | undefined;
    onChoose: (choice: T | undefined) => void;
    onDelete?: () => void;
    fieldIsInvalid: boolean;
    'data-test-subj'?: string;
}
export declare function FieldPicker<T extends FieldOptionValue = FieldOptionValue>(props: FieldPickerProps<T>): React.JSX.Element;
