import React from 'react';
import type { FieldDefinition, UnsavedFieldChange, SettingType } from '@kbn/management-settings-types';
/**
 * Props for a {@link FieldTitle} component.
 */
export interface TitleProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Pick<FieldDefinition<T>, 'id' | 'type' | 'isOverridden' | 'savedValue'>;
    /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
    unsavedChange?: UnsavedFieldChange<T>;
}
/**
 *
 */
export declare const FieldTitleUnsavedIcon: <T extends SettingType>({ field, unsavedChange, }: TitleProps<T>) => React.JSX.Element | null;
