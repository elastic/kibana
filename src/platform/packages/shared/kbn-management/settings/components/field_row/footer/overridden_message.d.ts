import React from 'react';
import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';
type Field<T extends SettingType> = Pick<FieldDefinition<T>, 'id' | 'isOverridden' | 'name'>;
export declare const DATA_TEST_SUBJ_OVERRIDDEN_PREFIX = "field-row-input-overridden-message";
/**
 * Props for a {@link FieldOverriddenMessage} component.
 */
export interface FieldOverriddenMessageProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Field<T>;
}
export declare const FieldOverriddenMessage: <T extends SettingType>({ field, }: FieldOverriddenMessageProps<T>) => React.JSX.Element | null;
export {};
