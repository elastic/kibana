import type { ControlValuesSource } from './control_constants';
export declare const MAX_OPTIONS_LIST_REQUEST_SIZE = 1000;
export declare const DEFAULT_DSL_OPTIONS_LIST_STATE: {
    readonly values_source: ControlValuesSource.FIELD;
    readonly sort: {
        readonly by: "_count";
        readonly direction: "desc";
    };
    readonly search_technique: "wildcard";
    readonly single_select: false;
    readonly exclude: false;
    readonly exists_selected: false;
    readonly run_past_timeout: false;
    readonly selected_options: Array<string | number>;
    readonly use_global_filters: boolean;
    readonly ignore_validations: boolean;
};
export declare const DEFAULT_ESQL_OPTIONS_LIST_STATE: {
    readonly single_select: true;
    readonly selected_options: Array<string>;
};
