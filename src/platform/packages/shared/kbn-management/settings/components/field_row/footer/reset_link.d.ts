import React from 'react';
import type { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
/**
 * Props for a {@link InputResetLink} component.
 */
export interface InputResetLinkProps<T extends SettingType = SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Pick<FieldDefinition<T>, 'ariaAttributes' | 'id' | 'savedValue' | 'isOverridden' | 'defaultValue' | 'type'>;
    /** A handler for when a field is reset to its default or saved value. */
    onReset: () => void;
    /** A change to the current field, if any. */
    unsavedChange?: UnsavedFieldChange<T>;
}
export declare const DATA_TEST_SUBJ_RESET_PREFIX = "management-settings-resetField";
/**
 * Component for rendering a link to reset a {@link FieldDefinition} to its default
 * or saved value.
 */
export declare const InputResetLink: <T extends SettingType>({ onReset: onClick, field, unsavedChange, }: InputResetLinkProps<T>) => React.JSX.Element | null;
