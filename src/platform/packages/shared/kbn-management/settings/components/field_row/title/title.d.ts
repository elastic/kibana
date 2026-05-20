import React from 'react';
import type { Interpolation, Theme } from '@emotion/react';
import type { FieldDefinition, UnsavedFieldChange, SettingType } from '@kbn/management-settings-types';
/**
 * Props for a {@link FieldTitle} component.
 */
export interface TitleProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Pick<FieldDefinition<T>, 'displayName' | 'savedValue' | 'isCustom' | 'id' | 'type' | 'isOverridden' | 'technicalPreview'>;
    /** Emotion-based `css` for the root React element. */
    css?: Interpolation<Theme>;
    /** Classname for the root React element. */
    className?: string;
    /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
    unsavedChange?: UnsavedFieldChange<T>;
}
/**
 * Component for displaying the `displayName` and status of a {@link FieldDefinition} in
 * the {@link FieldRow}.
 */
export declare const FieldTitle: <T extends SettingType>({ field, unsavedChange, ...props }: TitleProps<T>) => React.JSX.Element;
