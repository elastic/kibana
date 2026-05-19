import React from 'react';
import type { FieldDefinition, OnInputChangeFn, ResetInputRef, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
/**
 * The props that are passed to the {@link FieldInput} component.
 */
export interface FieldInputProps<T extends SettingType = SettingType> {
    /** The {@link FieldDefinition} for the component. */
    field: Pick<FieldDefinition<T>, 'type' | 'id' | 'name' | 'ariaAttributes'>;
    /** An {@link UnsavedFieldChange} for the component, if any. */
    unsavedChange?: UnsavedFieldChange<T>;
    /** The `onInputChange` handler for the input. */
    onInputChange: OnInputChangeFn<T>;
    /** True if the input can be saved, false otherwise. */
    isSavingEnabled: boolean;
    /** True if the value within the input is invalid, false otherwise. */
    isInvalid?: boolean;
}
/**
 * An input that allows one to change a setting in Kibana.
 *
 * @param props The props for the {@link FieldInput} component.
 */
export declare const FieldInput: React.ForwardRefExoticComponent<FieldInputProps<import("@kbn/core/server").UiSettingsType> & React.RefAttributes<ResetInputRef>>;
