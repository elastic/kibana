import type { EuiComboBoxOptionOption } from '@elastic/eui';
type FieldOnlyDataType = 'document' | 'ip' | 'histogram' | 'geo_point' | 'geo_shape' | 'counter' | 'gauge' | 'murmur3';
export type DataType = 'string' | 'number' | 'date' | 'boolean' | FieldOnlyDataType;
export interface FieldOptionValue {
    type: 'field';
    field: string;
    dataType?: DataType;
}
interface FieldValue<T> {
    label: string;
    value: T;
    exists: boolean;
    compatible: number | boolean;
    'data-test-subj'?: string;
    options?: Array<FieldValue<T>>;
}
export type FieldOption<T extends FieldOptionValue> = FieldValue<T> & EuiComboBoxOptionOption<T>;
export {};
