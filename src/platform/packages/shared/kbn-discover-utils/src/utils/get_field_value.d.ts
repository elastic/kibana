import type { DataTableRecord } from '../types';
export declare const getFieldValue: <TRecord extends DataTableRecord, TField extends string>(record: TRecord, field: TField & keyof TRecord["flattened"]) => TRecord["flattened"][TField];
