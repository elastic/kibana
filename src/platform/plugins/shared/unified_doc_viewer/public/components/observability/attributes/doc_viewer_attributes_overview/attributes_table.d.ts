import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import type { AttributeField } from './attributes_overview';
interface AttributesTableProps extends Pick<DocViewRenderProps, 'hit' | 'dataView' | 'columnsMeta' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'> {
    fields: AttributeField[];
    searchTerm: string;
    isEsqlMode: boolean;
}
export declare const AttributesTable: ({ hit, dataView, columnsMeta, fields, searchTerm, columns, filter, onAddColumn, onRemoveColumn, isEsqlMode, }: AttributesTableProps) => React.JSX.Element;
export {};
