import type { EuiDataGridSchemaDetector } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import type { DocMap } from '../../types';
export interface CompareDocumentsProps {
    id: string;
    wrapper: HTMLElement | null;
    consumer: string;
    ariaDescribedBy: string;
    ariaLabelledBy: string;
    dataView: DataView;
    columnsMeta?: DataTableColumnsMeta;
    isPlainRecord: boolean;
    selectedFieldNames: string[];
    selectedDocIds: string[];
    schemaDetectors: EuiDataGridSchemaDetector[];
    forceShowAllFields: boolean;
    showFullScreenButton?: boolean;
    fieldFormats: FieldFormatsStart;
    docMap: DocMap;
    replaceSelectedDocs: (docIds: string[]) => void;
    setIsCompareActive: (isCompareActive: boolean) => void;
}
declare const CompareDocuments: ({ id, wrapper, consumer, ariaDescribedBy, ariaLabelledBy, dataView, columnsMeta, isPlainRecord, selectedFieldNames, selectedDocIds: originalSelectedDocIds, schemaDetectors, forceShowAllFields, showFullScreenButton, fieldFormats, docMap: originalDocMap, replaceSelectedDocs: originalReplaceSelectedDocs, setIsCompareActive, }: CompareDocumentsProps) => React.JSX.Element;
export default CompareDocuments;
