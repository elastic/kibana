import React from 'react';
import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';
export interface ExperimentalBadgeProps<T extends SettingType> {
    field: Pick<FieldDefinition<T>, 'experimental'>;
}
export declare const FieldTitleExperimentalBadge: <T extends SettingType>({ field, }: ExperimentalBadgeProps<T>) => React.JSX.Element | null;
