import type { DataTableRecord } from '../types';
export declare function getFlattenedFields<T>(doc: DataTableRecord, fields: Array<keyof T>): T;
