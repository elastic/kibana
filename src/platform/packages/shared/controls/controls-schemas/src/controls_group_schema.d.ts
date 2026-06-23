export declare const controlWidthSchema: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
export declare const pinnedControlSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
}>;
export declare const getControlsSchema: () => import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"esql_control">;
    config: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        control_type: import("@kbn/config-schema").Type<"STATIC_VALUES">;
        available_options: import("@kbn/config-schema").Type<string[]>;
        selected_options: import("@kbn/config-schema").Type<string[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        variable_name: import("@kbn/config-schema").Type<string>;
        variable_type: import("@kbn/config-schema").Type<"functions" | "values" | "fields" | "time_literal" | "multi_values">;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    } | {
        control_type: import("@kbn/config-schema").Type<"VALUES_FROM_QUERY">;
        esql_query: import("@kbn/config-schema").Type<string>;
        selected_options: import("@kbn/config-schema").Type<string[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        variable_name: import("@kbn/config-schema").Type<string>;
        variable_type: import("@kbn/config-schema").Type<"functions" | "values" | "fields" | "time_literal" | "multi_values">;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    }>>;
} | {
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"options_list_control">;
    config: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        exclude: import("@kbn/config-schema").Type<boolean>;
        exists_selected: import("@kbn/config-schema").Type<boolean>;
        run_past_timeout: import("@kbn/config-schema").Type<boolean>;
        search_technique: import("@kbn/config-schema").Type<"prefix" | "wildcard" | "exact">;
        selected_options: import("@kbn/config-schema").Type<(string | number)[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        sort: import("@kbn/config-schema").ObjectType<{
            by: import("@kbn/config-schema").Type<"_count" | "_key">;
            direction: import("@kbn/config-schema").Type<"asc" | "desc">;
        }>;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.ESQL>;
        esql_query: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    } | {
        exclude: import("@kbn/config-schema").Type<boolean>;
        exists_selected: import("@kbn/config-schema").Type<boolean>;
        run_past_timeout: import("@kbn/config-schema").Type<boolean>;
        search_technique: import("@kbn/config-schema").Type<"prefix" | "wildcard" | "exact">;
        selected_options: import("@kbn/config-schema").Type<(string | number)[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        sort: import("@kbn/config-schema").ObjectType<{
            by: import("@kbn/config-schema").Type<"_count" | "_key">;
            direction: import("@kbn/config-schema").Type<"asc" | "desc">;
        }>;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.FIELD>;
        data_view_id: import("@kbn/config-schema").Type<string>;
        field_name: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    }>>;
} | {
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"range_slider_control">;
    config: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        value: import("@kbn/config-schema").Type<string[] | undefined>;
        step: import("@kbn/config-schema").Type<number>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.ESQL>;
        esql_query: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    } | {
        value: import("@kbn/config-schema").Type<string[] | undefined>;
        step: import("@kbn/config-schema").Type<number>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.FIELD>;
        data_view_id: import("@kbn/config-schema").Type<string>;
        field_name: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    }>>;
} | {
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"time_slider_control">;
    config: import("@kbn/config-schema").ObjectType<{
        start_percentage_of_time_range: import("@kbn/config-schema").Type<number>;
        end_percentage_of_time_range: import("@kbn/config-schema").Type<number>;
        is_anchored: import("@kbn/config-schema").Type<boolean>;
    }>;
}>>;
export declare const getControlsGroupSchema: () => import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"esql_control">;
    config: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        control_type: import("@kbn/config-schema").Type<"STATIC_VALUES">;
        available_options: import("@kbn/config-schema").Type<string[]>;
        selected_options: import("@kbn/config-schema").Type<string[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        variable_name: import("@kbn/config-schema").Type<string>;
        variable_type: import("@kbn/config-schema").Type<"functions" | "values" | "fields" | "time_literal" | "multi_values">;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    } | {
        control_type: import("@kbn/config-schema").Type<"VALUES_FROM_QUERY">;
        esql_query: import("@kbn/config-schema").Type<string>;
        selected_options: import("@kbn/config-schema").Type<string[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        variable_name: import("@kbn/config-schema").Type<string>;
        variable_type: import("@kbn/config-schema").Type<"functions" | "values" | "fields" | "time_literal" | "multi_values">;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    }>>;
} | {
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"options_list_control">;
    config: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        exclude: import("@kbn/config-schema").Type<boolean>;
        exists_selected: import("@kbn/config-schema").Type<boolean>;
        run_past_timeout: import("@kbn/config-schema").Type<boolean>;
        search_technique: import("@kbn/config-schema").Type<"prefix" | "wildcard" | "exact">;
        selected_options: import("@kbn/config-schema").Type<(string | number)[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        sort: import("@kbn/config-schema").ObjectType<{
            by: import("@kbn/config-schema").Type<"_count" | "_key">;
            direction: import("@kbn/config-schema").Type<"asc" | "desc">;
        }>;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.ESQL>;
        esql_query: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    } | {
        exclude: import("@kbn/config-schema").Type<boolean>;
        exists_selected: import("@kbn/config-schema").Type<boolean>;
        run_past_timeout: import("@kbn/config-schema").Type<boolean>;
        search_technique: import("@kbn/config-schema").Type<"prefix" | "wildcard" | "exact">;
        selected_options: import("@kbn/config-schema").Type<(string | number)[]>;
        single_select: import("@kbn/config-schema").Type<boolean>;
        sort: import("@kbn/config-schema").ObjectType<{
            by: import("@kbn/config-schema").Type<"_count" | "_key">;
            direction: import("@kbn/config-schema").Type<"asc" | "desc">;
        }>;
        display_settings: import("@kbn/config-schema").Type<Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.FIELD>;
        data_view_id: import("@kbn/config-schema").Type<string>;
        field_name: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    }>>;
} | {
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"range_slider_control">;
    config: import("@kbn/config-schema").Type<import("@kbn/config-schema/src/types").ObjectResultUnionType<{
        value: import("@kbn/config-schema").Type<string[] | undefined>;
        step: import("@kbn/config-schema").Type<number>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.ESQL>;
        esql_query: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    } | {
        value: import("@kbn/config-schema").Type<string[] | undefined>;
        step: import("@kbn/config-schema").Type<number>;
        values_source: import("@kbn/config-schema").Type<import("@kbn/controls-constants").ControlValuesSource.FIELD>;
        data_view_id: import("@kbn/config-schema").Type<string>;
        field_name: import("@kbn/config-schema").Type<string>;
        use_global_filters: import("@kbn/config-schema").Type<boolean>;
        ignore_validations: import("@kbn/config-schema").Type<boolean>;
        title: import("@kbn/config-schema").Type<string | undefined>;
    }>>;
} | {
    id: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
    grow: import("@kbn/config-schema").Type<boolean>;
    type: import("@kbn/config-schema").Type<"time_slider_control">;
    config: import("@kbn/config-schema").ObjectType<{
        start_percentage_of_time_range: import("@kbn/config-schema").Type<number>;
        end_percentage_of_time_range: import("@kbn/config-schema").Type<number>;
        is_anchored: import("@kbn/config-schema").Type<boolean>;
    }>;
}>[]>;
