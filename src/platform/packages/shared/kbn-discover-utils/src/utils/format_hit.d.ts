import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, ShouldShowFieldInTableHandler, FormattedHit, DataTableColumnsMeta } from '../types';
/**
 * Returns a formatted document in form of key/value pairs of the fields name and a formatted value.
 * The value returned in each pair is an HTML string which is safe to be applied to the DOM, since
 * it's formatted using field formatters.
 * @param hit
 * @param dataView
 * @param shouldShowFieldHandler
 * @param maxEntries
 * @param fieldFormats
 * @param columnsMeta
 */
export declare function formatHit(hit: DataTableRecord, dataView: DataView, shouldShowFieldHandler: ShouldShowFieldInTableHandler, maxEntries: number, fieldFormats: FieldFormatsStart, columnsMeta: DataTableColumnsMeta | undefined): FormattedHit;
