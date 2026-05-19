import type { ToastsStart } from '@kbn/core/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare const useFiltersValidation: ({ dataView, filterManager, toastNotifications, }: {
    dataView: DataView;
    filterManager: FilterManager;
    toastNotifications: ToastsStart;
}) => void;
