import type { PointerEvent } from '@elastic/charts';
import type { Datatable } from '@kbn/expressions-plugin/public';
/** @public **/
export type ActiveCursorSyncOption = DateHistogramSyncOption | DatatablesSyncOption;
/** @internal **/
export interface ActiveCursorPayload {
    cursor: PointerEvent;
    isDateHistogram?: boolean;
    accessors?: string[];
}
/** @internal **/
interface BaseSyncOptions {
    debounce?: number;
}
/** @internal **/
export interface DateHistogramSyncOption extends BaseSyncOptions {
    isDateHistogram: boolean;
}
/** @internal **/
export interface DatatablesSyncOption extends BaseSyncOptions {
    datatables: Datatable[];
}
export {};
