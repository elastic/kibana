import type { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
type F<T extends SettingType> = Pick<FieldDefinition<T>, 'savedValue' | 'defaultValue'>;
type C<T extends SettingType> = UnsavedFieldChange<T>;
/**
 * Utility function to determine if a given value is equal to the default value of
 * a {@link FieldDefinition}.
 *
 * @param field The field to compare.
 * @param change The unsaved change to compare.
 */
export declare function isFieldDefaultValue<S extends SettingType>(field: F<S>, change?: C<S>): boolean;
export {};
