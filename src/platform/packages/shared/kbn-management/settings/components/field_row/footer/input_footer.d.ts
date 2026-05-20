import React from 'react';
import type { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
export declare const DATA_TEST_SUBJ_FOOTER_PREFIX = "field-row-input-footer";
type Field<T extends SettingType> = Pick<FieldDefinition<T>, 'id' | 'name' | 'isOverridden' | 'type' | 'ariaAttributes' | 'isDefaultValue'>;
/**
 * Props for a {@link FieldInputFooter} component.
 */
export interface FieldInputFooterProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Field<T>;
    /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
    unsavedChange?: UnsavedFieldChange<T>;
    /** A handler for clearing, rather than resetting the field. */
    onClear: () => void;
    /** A handler for when a field is reset to its default or saved value. */
    onReset: () => void;
    /** True if saving this setting is enabled, false otherwise. */
    isSavingEnabled: boolean;
}
export declare const FieldInputFooter: <T extends SettingType>({ field, isSavingEnabled, onClear, onReset, unsavedChange, }: FieldInputFooterProps<T>) => React.JSX.Element | null;
export {};
