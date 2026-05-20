import type { ReactNode } from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '../types';
export declare function getFormattedFields<T>(doc: DataTableRecord, fields: Array<keyof T>, { dataView, fieldFormats }: {
    dataView: DataView;
    fieldFormats: FieldFormatsStart;
}): {
    [K in keyof T]?: ReactNode;
};
