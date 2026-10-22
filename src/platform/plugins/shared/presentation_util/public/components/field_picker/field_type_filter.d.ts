import React from 'react';
import type { EuiFilterButtonProps } from '@elastic/eui';
export interface Props {
    onFieldTypesChange: (value: string[]) => void;
    buttonProps?: Partial<EuiFilterButtonProps>;
    setFocusToSearch: () => void;
    availableFieldTypes: string[];
    fieldTypesValue: string[];
}
export declare function FieldTypeFilter({ availableFieldTypes, onFieldTypesChange, setFocusToSearch, fieldTypesValue, buttonProps, }: Props): React.JSX.Element;
