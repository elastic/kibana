import React from 'react';
import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';
/**
 * Props for a {@link FieldTitle} component.
 */
export interface TechnicalPreviewBadgeProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Pick<FieldDefinition<T>, 'technicalPreview'>;
}
/**
 *
 */
export declare const FieldTitleTechnicalPreviewBadge: <T extends SettingType>({ field, }: TechnicalPreviewBadgeProps<T>) => React.JSX.Element | null;
