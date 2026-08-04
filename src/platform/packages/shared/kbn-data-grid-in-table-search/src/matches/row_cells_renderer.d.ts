import React from 'react';
import type { AllCellsProps, RowMatches } from '../types';
export declare function RowCellsRenderer({ rowIndex, inTableSearchTerm, visibleColumns, renderCellValue, onRowProcessed, }: Omit<AllCellsProps, 'rowsCount' | 'onFinish'> & {
    rowIndex: number;
    onRowProcessed: (rowMatch: RowMatches) => void;
}): React.JSX.Element | null;
