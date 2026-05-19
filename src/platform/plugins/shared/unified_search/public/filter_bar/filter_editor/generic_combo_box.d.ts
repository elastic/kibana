import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import React from 'react';
export interface GenericComboBoxProps<T> {
    options: T[];
    selectedOptions: T[];
    getLabel: (value: T) => string;
    onChange: (values: T[]) => void;
    renderOption?: (option: EuiComboBoxOptionOption, searchValue: string, OPTION_CONTENT_CLASSNAME: string) => React.ReactNode;
    inputRef?: ((instance: HTMLInputElement | null) => void) | undefined;
    truncationProps?: EuiComboBoxProps<T>['truncationProps'];
    [propName: string]: any;
}
/**
 * A generic combo box. Instead of accepting a set of options that contain a `label`, it accepts
 * any type of object. It also accepts a `getLabel` function that each object will be sent through
 * to get the label to be passed to the combo box. The `onChange` will trigger with the actual
 * selected objects, rather than an option object.
 */
export declare function GenericComboBox<T>(props: GenericComboBoxProps<T>): React.JSX.Element;
