import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, ShouldShowFieldInTableHandler, FormattedHit, DataTableColumnsMeta } from '../types';
/**
 * Returns a formatted document in form of key/value pairs where the value is a ReactNode
 * @param hit
 * @param dataView
 * @param shouldShowFieldHandler
 * @param maxEntries
 * @param fieldFormats
 * @param columnsMeta
 */
export declare function formatHitReact(hit: DataTableRecord, dataView: DataView, shouldShowFieldHandler: ShouldShowFieldInTableHandler, maxEntries: number, fieldFormats: FieldFormatsStart, columnsMeta: DataTableColumnsMeta | undefined): FormattedHit;
