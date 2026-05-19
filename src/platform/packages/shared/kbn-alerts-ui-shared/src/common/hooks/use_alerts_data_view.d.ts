import type { DataViewsContract, FieldSpec } from '@kbn/data-views-plugin/common';
import type { ToastsStart, HttpStart } from '@kbn/core/public';
import type { DataViewBase } from '@kbn/es-query';
export interface UseAlertsDataViewParams {
    http: HttpStart;
    dataViewsService: DataViewsContract;
    toasts: ToastsStart;
    fetchUnifiedAlertsFields?: boolean;
    /**
     * Array of rule type ids used for authorization and area-based filtering
     *
     * Security data views must be requested in isolation (i.e. `['siem']`). If mixed with
     * other rule type ids, the resulting data view will be empty.
     */
    ruleTypeIds: string[];
}
export interface UseAlertsDataViewResult {
    isLoading: boolean;
    dataView?: Omit<DataViewBase, 'fields'> & {
        fields: FieldSpec[];
    };
}
/**
 * Computes a {@link DataViewBase} object for alerts indices based on the provided feature ids
 *
 * @returns
 * A {@link DataViewBase} object, intentionally not typed as a complete {@link DataView} object
 * since only Security Solution uses an actual in-memory data view (when `ruleTypeIds` only contains
 * siem rule types).
 * In all other cases the data view is computed from the index names and fields fetched from the
 * alerting APIs.
 */
export declare const useAlertsDataView: ({ http, dataViewsService, toasts, ruleTypeIds, fetchUnifiedAlertsFields, }: UseAlertsDataViewParams) => UseAlertsDataViewResult;
