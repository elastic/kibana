import type { ReactNode } from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils/types';
import type { IgnoredReason } from '@kbn/discover-utils';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
export declare class FieldRow {
    #private;
    readonly name: string;
    readonly displayNameOverride: string | undefined;
    readonly flattenedValue: unknown;
    readonly dataViewField: DataViewField | undefined;
    readonly isPinned: boolean;
    readonly columnsMeta: DataTableColumnsMeta | undefined;
    constructor({ name, displayNameOverride, flattenedValue, hit, dataView, fieldFormats, isPinned, columnsMeta, }: {
        name: string;
        displayNameOverride?: string;
        flattenedValue: unknown;
        hit: DataTableRecord;
        dataView: DataView;
        fieldFormats: FieldFormatsStart;
        isPinned: boolean;
        columnsMeta: DataTableColumnsMeta | undefined;
    });
    get formattedAsReact(): ReactNode;
    get formattedAsText(): string | undefined;
    get fieldType(): string | undefined;
    get ignoredReason(): IgnoredReason | undefined;
}
