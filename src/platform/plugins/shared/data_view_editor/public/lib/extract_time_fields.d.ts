import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { TimestampOption } from '../types';
export declare const noTimeFieldLabel: string;
export declare const noTimeFieldValue = "";
export declare function extractTimeFields(fields: DataViewField[], requireTimestampField?: boolean): TimestampOption[];
