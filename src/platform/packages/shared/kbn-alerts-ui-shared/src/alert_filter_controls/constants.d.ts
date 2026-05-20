import type { OptionsListControlState, PinnedControlState } from '@kbn/controls-schemas';
import type { FilterControlConfig } from './types';
export declare const DEFAULT_CONTROLS: FilterControlConfig[];
export declare const URL_PARAM_KEY = "pageFilters";
export declare const TEST_IDS: {
    FILTER_CONTROLS: string;
    FILTER_LOADING: string;
    MOCKED_CONTROL: string;
    ADD_CONTROL: string;
    SAVE_CONTROL: string;
    SAVE_CHANGE_POPOVER: string;
    FILTERS_CHANGED_BANNER: string;
    FILTERS_CHANGED_BANNER_SAVE: string;
    FILTERS_CHANGED_BANNER_DISCARD: string;
    CONTEXT_MENU: {
        BTN: string;
        MENU: string;
        RESET: string;
        EDIT: string;
        DISCARD: string;
    };
};
export declare const COMMON_OPTIONS_LIST_CONTROL_INPUTS: Partial<PinnedControlState> & Partial<OptionsListControlState>;
export declare const TIMEOUTS: {
    FILTER_UPDATES_DEBOUNCE_TIME: number;
};
