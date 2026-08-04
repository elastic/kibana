import React, { type ReactNode } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
export type FieldConfigValue = string | number | undefined;
export interface FieldConfiguration {
    title: string;
    formatter?: (value: FieldConfigValue, formattedValue: ReactNode) => ReactNode;
    description?: string;
}
export interface TableFieldConfiguration {
    name: string;
    value: unknown;
    description?: string;
    type?: string;
    valueCellContent: (params?: {
        truncate?: boolean;
    }) => React.ReactNode;
}
export interface ContentFrameworkTableProps extends Pick<DocViewRenderProps, 'hit' | 'dataView' | 'columnsMeta' | 'textBasedHits' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'> {
    fieldNames: string[];
    fieldConfigurations?: Record<string, FieldConfiguration>;
    id: string;
    'data-test-subj'?: string;
}
export declare function ContentFrameworkTable({ hit, fieldNames, fieldConfigurations, dataView, columns, id, textBasedHits, 'data-test-subj': dataTestSubj, filter, onAddColumn, onRemoveColumn, }: ContentFrameworkTableProps): React.JSX.Element | null;
