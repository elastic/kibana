import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, LogDocumentOverview } from '../..';
export declare function getLogDocumentOverview(doc: DataTableRecord, { dataView, fieldFormats }: {
    dataView: DataView;
    fieldFormats: FieldFormatsStart;
}): LogDocumentOverview;
