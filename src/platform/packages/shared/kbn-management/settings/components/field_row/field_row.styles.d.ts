import type { UnsavedFieldChange, FieldDefinition, SettingType } from '@kbn/management-settings-types';
/**
 * Parameters for the {@link useFieldStyles} hook.
 */
export interface Params<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Pick<FieldDefinition<T>, 'savedValue'>;
    /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
    unsavedChange?: UnsavedFieldChange<T>;
}
/**
 * A React hook that provides stateful `css` classes for the {@link FieldRow} component.
 */
export declare const useFieldStyles: <T extends SettingType>({ field, unsavedChange }: Params<T>) => {
    cssFieldFormGroup: import("@emotion/react").SerializedStyles;
    cssFieldTitle: import("@emotion/react").SerializedStyles;
    cssDescription: import("@emotion/react").SerializedStyles;
};
