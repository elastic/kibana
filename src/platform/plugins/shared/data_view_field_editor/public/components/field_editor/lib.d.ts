import type { BehaviorSubject } from 'rxjs';
import type { FieldConfig } from '../../shared_imports';
import type { Field } from '../../types';
import type { Context } from '../field_editor_context';
import type { Props } from './field_editor';
import type { FieldPreview } from '../preview/types';
import { ChangeType } from '../preview/types';
import type { RuntimePrimitiveTypes } from '../../shared_imports';
export interface Change {
    changeType: ChangeType;
    type?: RuntimePrimitiveTypes;
}
export type ChangeSet = Record<string, Change>;
/**
 * Dynamically retrieve the config for the "name" field, adding
 * a validator to avoid duplicated runtime fields to be created.
 *
 * @param field Initial value of the form
 */
export declare const getNameFieldConfig: (dataView: Context["dataView"], field?: Props["field"]) => FieldConfig<string, Field>;
export declare const valueToComboBoxOption: (value: string) => import("@elastic/eui/src/components/combo_box/types").EuiComboBoxOptionOption<"boolean" | "ip" | "date" | "long" | "keyword" | "double" | "geo_point" | "composite"> | undefined;
export declare const getFieldPreviewChanges: (subject: BehaviorSubject<FieldPreview[] | undefined>, parentName: string) => import("rxjs").Observable<ChangeSet>;
