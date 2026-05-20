import React from 'react';
import type { FieldDefinition, SettingType, UnsavedFieldChange, OnFieldChangeFn } from '@kbn/management-settings-types';
export declare const DATA_TEST_SUBJ_SCREEN_READER_MESSAGE = "fieldRowScreenReaderMessage";
type Definition<T extends SettingType = SettingType> = Pick<FieldDefinition<T>, 'ariaAttributes' | 'defaultValue' | 'defaultValueDisplay' | 'displayName' | 'groupId' | 'id' | 'isCustom' | 'isDefaultValue' | 'isOverridden' | 'name' | 'savedValue' | 'type' | 'technicalPreview' | 'unsavedFieldId'>;
/**
 * Props for a {@link FieldRow} component.
 */
export interface FieldRowProps {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Definition;
    /** True if saving settings is enabled, false otherwise. */
    isSavingEnabled: boolean;
    /** The {@link OnInputChangeFn} handler. */
    onFieldChange: OnFieldChangeFn;
    /**
     * The onClear handler, if a value is cleared to an empty or default state.
     * @param id The id relating to the field to clear.
     */
    onClear?: (id: string) => void;
    /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
    unsavedChange?: UnsavedFieldChange;
}
/**
 * Component for displaying a {@link FieldDefinition} in a form row, using a {@link FieldInput}.
 * @param props The {@link FieldRowProps} for the {@link FieldRow} component.
 */
export declare const FieldRow: (props: FieldRowProps) => React.JSX.Element;
export {};
