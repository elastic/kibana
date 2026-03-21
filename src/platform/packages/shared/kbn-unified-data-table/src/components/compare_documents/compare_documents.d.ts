import type { EuiDataGridSchemaDetector } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
export interface CompareDocumentsProps {
    id: string;
    wrapper: HTMLElement | null;
    consumer: string;
    ariaDescribedBy: string;
    ariaLabelledBy: string;
    dataView: DataView;
    isPlainRecord: boolean;
    selectedFieldNames: string[];
    selectedDocIds: string[];
    schemaDetectors: EuiDataGridSchemaDetector[];
    forceShowAllFields: boolean;
    showFullScreenButton?: boolean;
    fieldFormats: FieldFormatsStart;
    getDocById: (id: string) => DataTableRecord | undefined;
    replaceSelectedDocs: (docIds: string[]) => void;
    setIsCompareActive: (isCompareActive: boolean) => void;
}
declare const CompareDocuments: ({ id, wrapper, consumer, ariaDescribedBy, ariaLabelledBy, dataView, isPlainRecord, selectedFieldNames, selectedDocIds, schemaDetectors, forceShowAllFields, showFullScreenButton, fieldFormats, getDocById, replaceSelectedDocs, setIsCompareActive, }: CompareDocumentsProps) => React.JSX.Element;
export default CompareDocuments;
