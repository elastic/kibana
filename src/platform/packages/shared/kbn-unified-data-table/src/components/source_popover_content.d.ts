import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import React from 'react';
export declare const SourcePopoverContent: ({ closeButton, columnId, row, useTopLevelObjectColumns, dataTestSubj, }: {
    closeButton: JSX.Element;
    columnId: string;
    row: DataTableRecord;
    useTopLevelObjectColumns: boolean;
    dataTestSubj?: string;
}) => React.JSX.Element;
export default SourcePopoverContent;
