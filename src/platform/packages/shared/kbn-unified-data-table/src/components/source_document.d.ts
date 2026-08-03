import React from 'react';
import type { DataTableColumnsMeta, DataTableRecord, ShouldShowFieldInTableHandler } from '@kbn/discover-utils/src/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
export declare function SourceDocument({ useTopLevelObjectColumns, row, columnId, dataView, shouldShowFieldHandler, maxEntries, isPlainRecord, fieldFormats, dataTestSubj, className, isCompressed, columnsMeta, }: {
    useTopLevelObjectColumns: boolean;
    row: DataTableRecord;
    columnId: string;
    dataView: DataView;
    shouldShowFieldHandler: ShouldShowFieldInTableHandler;
    maxEntries: number;
    isPlainRecord?: boolean;
    fieldFormats: FieldFormatsStart;
    dataTestSubj?: string;
    className?: string;
    isCompressed?: boolean;
    columnsMeta: DataTableColumnsMeta | undefined;
}): React.JSX.Element;
export default SourceDocument;
