import React from 'react';
import type { FieldDefinition, SettingType } from '@kbn/management-settings-types';
export declare const DATA_TEST_SUBJ_DEPRECATION_PREFIX = "description-block-deprecation";
type Field<T extends SettingType> = Pick<FieldDefinition<T>, 'id' | 'deprecation' | 'name'>;
/**
 * Props for a {@link FieldDeprecation} component.
 */
export interface FieldDeprecationProps<T extends SettingType> {
    /** The {@link FieldDefinition} corresponding the setting. */
    field: Field<T>;
}
/**
 *
 */
export declare const FieldDeprecation: <T extends SettingType>({ field }: FieldDeprecationProps<T>) => React.JSX.Element | null;
export {};
