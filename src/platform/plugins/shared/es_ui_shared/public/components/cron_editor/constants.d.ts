import type { EuiSelectOption } from '@elastic/eui';
import type { Frequency, Field, FieldToValueMap } from './types';
type FieldFlags = {
    [key in Field]?: boolean;
};
export declare const MINUTE_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const HOUR_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const DAY_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const DATE_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const MONTH_OPTIONS: {
    value: string;
    text: string;
}[];
export declare const UNITS: EuiSelectOption[];
export declare const frequencyToFieldsMap: Record<Frequency, FieldFlags>;
export declare const frequencyToBaselineFieldsMap: Record<Frequency, FieldToValueMap>;
export {};
