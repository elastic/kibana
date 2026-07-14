export declare const ESQL_CONTROL = "esql_control";
export declare const OPTIONS_LIST_CONTROL = "options_list_control";
export declare const RANGE_SLIDER_CONTROL = "range_slider_control";
export declare const TIME_SLIDER_CONTROL = "time_slider_control";
export declare const DEFAULT_DATA_CONTROL_STATE: {
    use_global_filters: boolean;
    ignore_validations: boolean;
};
export declare enum ControlValuesSource {
    FIELD = "field",
    ESQL = "esql"
}
export declare const DEFAULT_CONTROL_VALUES_SOURCE = ControlValuesSource.FIELD;
export declare const SELECTIONS_MAX = 10000;
