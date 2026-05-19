import React from 'react';
import type { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
export declare const DATA_TEST_SUBJ_DESCRIPTION = "settings-description";
type Field<T extends SettingType> = Pick<FieldDefinition<T>, 'defaultValue' | 'defaultValueDisplay' | 'description' | 'id' | 'isDefaultValue' | 'name' | 'savedValue' | 'type'>;
/**
 * Props for a {@link FieldDescription} component.
 */
export interface FieldDescriptionProps<T extends SettingType> {
    field: Field<T>;
    unsavedChange?: UnsavedFieldChange<T>;
}
/**
 * Component for displaying the description of a {@link FieldDefinition}.
 */
export declare const FieldDescription: <T extends SettingType>({ field, unsavedChange, }: FieldDescriptionProps<T>) => React.JSX.Element;
export {};
