import type { SettingType } from './setting_type';
import type { UnsavedFieldChange } from './unsaved_change';
export type { ArrayFieldDefinition, BooleanFieldDefinition, ColorFieldDefinition, ImageFieldDefinition, JsonFieldDefinition, FieldDefinition, MarkdownFieldDefinition, NumberFieldDefinition, SelectFieldDefinition, StringFieldDefinition, UndefinedFieldDefinition, } from './field_definition';
export type { ArrayUiSettingMetadata, BooleanUiSettingMetadata, ColorUiSettingMetadata, ImageUiSettingMetadata, JsonUiSettingMetadata, MarkdownUiSettingMetadata, NumberUiSettingMetadata, SelectUiSettingMetadata, StringUiSettingMetadata, UndefinedUiSettingMetadata, UiSettingMetadata, KnownTypeToMetadata, UiSetting, } from './metadata';
export type { ArrayUnsavedFieldChange, BooleanUnsavedFieldChange, ColorUnsavedFieldChange, ImageUnsavedFieldChange, JsonUnsavedFieldChange, MarkdownUnsavedFieldChange, NumberUnsavedFieldChange, SelectUnsavedFieldChange, StringUnsavedFieldChange, UndefinedUnsavedFieldChange, UnsavedFieldChange, UnsavedFieldChanges, } from './unsaved_change';
export type { ArraySettingType, BooleanSettingType, KnownTypeToValue, NumberSettingType, SettingType, StringSettingType, UndefinedSettingType, Value, } from './setting_type';
export type { CategorizedFields, CategoryCounts } from './category';
export type { SettingsTabs } from './tab';
export type { SettingsCapabilities } from './capabilities';
/**
 * A React `ref` that indicates an input can be reset using an
 * imperative handle.
 */
export type ResetInputRef = {
    reset: () => void;
} | null;
/**
 * A function that is called when the value of a {@link FieldInput} changes.
 * @param change The {@link UnsavedFieldChange} passed to the handler.
 */
export type OnInputChangeFn<T extends SettingType = SettingType> = (change?: UnsavedFieldChange<T>) => void;
/**
 * An `onFieldChange` handler when a Field changes.
 * @param id A unique id corresponding to the particular setting being changed.
 * @param change The {@link UnsavedFieldChange} corresponding to any unsaved change to the field.
 */
export type OnFieldChangeFn<T extends SettingType = SettingType> = (id: string, change?: UnsavedFieldChange<T>) => void;
