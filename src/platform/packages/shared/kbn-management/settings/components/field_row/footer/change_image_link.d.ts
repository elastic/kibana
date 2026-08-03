import React from 'react';
import type { FieldDefinition, SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';
export declare const DATA_TEST_SUBJ_CHANGE_LINK_PREFIX = "management-settings-change-image";
type Field<T extends SettingType> = Pick<FieldDefinition<T>, 'id' | 'type' | 'savedValue' | 'ariaAttributes' | 'isOverridden'>;
/**
 * Props for a {@link ChangeImageLink} component.
 */
export interface ChangeImageLinkProps<T extends SettingType = 'image'> {
    /** The {@link ImageFieldDefinition} corresponding the setting. */
    field: Field<T>;
    unsavedChange?: UnsavedFieldChange<T>;
    onClear: () => void;
}
/**
 * Component for rendering a link to change the image in a {@link FieldRow} of
 * an {@link ImageFieldDefinition}.
 */
export declare const ChangeImageLink: <T extends SettingType>({ field, onClear, unsavedChange, }: ChangeImageLinkProps<T>) => React.JSX.Element | null;
export {};
