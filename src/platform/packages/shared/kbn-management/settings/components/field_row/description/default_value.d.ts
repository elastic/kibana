import React from 'react';
import type { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
export declare const DATA_TEST_SUBJ_DEFAULT_DISPLAY_PREFIX = "default-display-block";
/**
 * Props for a {@link FieldDefaultValue} component.
 */
export interface FieldDefaultValueProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Pick<FieldDefinition<T>, 'id' | 'type' | 'isDefaultValue' | 'defaultValueDisplay' | 'defaultValue'>;
    unsavedChange?: UnsavedFieldChange<T>;
}
/**
 * Component for displaying the default value of a {@link FieldDefinition}
 * in the {@link FieldRow}.
 */
export declare const FieldDefaultValue: <T extends SettingType>({ field, unsavedChange, }: FieldDefaultValueProps<T>) => React.JSX.Element | null;
