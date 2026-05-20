import React from 'react';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { AttributeField } from './attributes_overview';
interface AttributesAccordionProps {
    id: string;
    title: string;
    ariaLabel: string;
    tooltipMessage: string;
    fields: AttributeField[];
    hit: DataTableRecord;
    dataView: DataView;
    columns?: string[];
    columnsMeta?: DataTableColumnsMeta;
    searchTerm: string;
    onAddColumn?: (col: string) => void;
    onRemoveColumn?: (col: string) => void;
    filter?: DocViewFilterFn;
    isEsqlMode: boolean;
}
export declare const AttributesAccordion: ({ id, title, tooltipMessage, fields, hit, dataView, columns, columnsMeta, searchTerm, onAddColumn, onRemoveColumn, filter, isEsqlMode, }: AttributesAccordionProps) => React.JSX.Element;
export {};
