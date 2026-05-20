import React from 'react';
import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';
/**
 * Props for a {@link FieldTitle} component.
 */
export interface TitleProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Pick<FieldDefinition<T>, 'isCustom'>;
}
/**
 *
 */
export declare const FieldTitleCustomIcon: <T extends SettingType>({ field }: TitleProps<T>) => React.JSX.Element | null;
