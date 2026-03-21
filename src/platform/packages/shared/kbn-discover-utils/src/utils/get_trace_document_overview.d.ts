import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord, TraceDocumentOverview } from '../types';
export declare function getTraceDocumentOverview(doc: DataTableRecord, { dataView, fieldFormats }: {
    dataView: DataView;
    fieldFormats: FieldFormatsStart;
}): TraceDocumentOverview;
export declare function getFlattenedTraceDocumentOverview(doc: DataTableRecord): TraceDocumentOverview;
