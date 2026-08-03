import type { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
/**
 * Compares a given {@link FieldDefinition} to an {@link UnsavedFieldChange} to determine
 * if the field has an unsaved change in the UI.
 *
 * @param field The field to compare.
 * @param unsavedChange The unsaved change to compare.
 */
export declare const hasUnsavedChange: <T extends SettingType>(field: Pick<FieldDefinition<T>, "savedValue" | "defaultValue">, unsavedChange?: Pick<UnsavedFieldChange<T>, "unsavedValue">) => boolean;
