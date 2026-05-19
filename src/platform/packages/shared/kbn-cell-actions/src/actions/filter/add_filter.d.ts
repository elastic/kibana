import type { FilterManager } from '@kbn/data-plugin/public';
import type { DefaultActionsSupportedValue } from '../types';
interface AddFilterParams {
    filterManager: FilterManager;
    key: string;
    value: DefaultActionsSupportedValue;
    negate: boolean;
    dataViewId?: string;
}
export declare const addFilter: ({ filterManager, key, value, negate, dataViewId }: AddFilterParams) => void;
interface AddExistsFilterParams {
    filterManager: FilterManager;
    key: string;
    negate: boolean;
    dataViewId?: string;
}
export declare const addExistsFilter: ({ filterManager, key, negate, dataViewId, }: AddExistsFilterParams) => void;
export declare const isEmptyFilterValue: (value: Array<string | number | boolean>) => boolean;
export {};
