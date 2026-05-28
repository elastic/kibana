import type { DataView } from '@kbn/data-views-plugin/common';
import { type FlattenedFieldsComparator } from '@kbn/data-service';
import type { DataTableRecord, EsHitRecord } from '../types';
/**
 * Build a record for data grid
 * @param doc the document returned from Elasticsearch
 * @param dataView this current data view
 * @param isAnchor determines if the given doc is the anchor doc when viewing surrounding documents
 */
export declare function buildDataTableRecord(doc: EsHitRecord, dataView?: DataView, isAnchor?: boolean, options?: {
    flattenedFieldsComparator?: FlattenedFieldsComparator;
}): DataTableRecord;
/**
 * Helper to build multiple DataTableRecords at once, saved a bit of testing code lines
 * @param records Array of documents returned from Elasticsearch
 * @param dataView this current data view
 */
export declare function buildDataTableRecordList<T extends DataTableRecord = DataTableRecord>({ records, dataView, processRecord, }: {
    records: EsHitRecord[];
    dataView?: DataView;
    processRecord?: (record: DataTableRecord) => T;
}): DataTableRecord[];
