import React from 'react';
import type { UnifiedDataTableRenderCustomToolbarProps } from '@kbn/unified-data-table';
import type { EditLookupIndexContentContext } from '../../types';
interface CustomToolBarProps {
    rowsCount?: number;
    onOpenIndexInDiscover?: EditLookupIndexContentContext['onOpenIndexInDiscover'];
}
export declare const getGridToolbar: ({ rowsCount, onOpenIndexInDiscover }: CustomToolBarProps) => ({ gridProps: { additionalControls } }: UnifiedDataTableRenderCustomToolbarProps) => React.JSX.Element;
export {};
