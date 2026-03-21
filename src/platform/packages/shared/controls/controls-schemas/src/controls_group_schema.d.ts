export declare const controlWidthSchema: import("@kbn/config-schema").Type<"small" | "medium" | "large">;
export declare const pinnedControlSchema: import("@kbn/config-schema").ObjectType<{
    uid: import("@kbn/config-schema").Type<string | undefined>;
    width: import("@kbn/config-schema").Type<"small" | "medium" | "large" | undefined>;
    grow: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const controlsGroupSchema: import("@kbn/config-schema").Type<(Readonly<{
    width?: "small" | "medium" | "large" | undefined;
    grow?: boolean | undefined;
    uid?: string | undefined;
} & {
    config: Readonly<{
        title?: string | undefined;
        sort?: Readonly<{} & {
            direction: "desc" | "asc";
            by: "_count" | "_key";
        }> | undefined;
        use_global_filters?: boolean | undefined;
        ignore_validations?: boolean | undefined;
        display_settings?: Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined;
        single_select?: boolean | undefined;
        exclude?: boolean | undefined;
        exists_selected?: boolean | undefined;
        run_past_timeout?: boolean | undefined;
        search_technique?: "prefix" | "wildcard" | "exact" | undefined;
        selected_options?: (string | number)[] | undefined;
    } & {
        data_view_id: string;
        field_name: string;
    }>;
    type: "options_list_control";
}> | Readonly<{
    width?: "small" | "medium" | "large" | undefined;
    grow?: boolean | undefined;
    uid?: string | undefined;
} & {
    config: Readonly<{
        title?: string | undefined;
        step?: number | undefined;
        value?: string[] | undefined;
        use_global_filters?: boolean | undefined;
        ignore_validations?: boolean | undefined;
    } & {
        data_view_id: string;
        field_name: string;
    }>;
    type: "range_slider_control";
}> | Readonly<{
    width?: "small" | "medium" | "large" | undefined;
    grow?: boolean | undefined;
    uid?: string | undefined;
} & {
    config: Readonly<{
        start_percentage_of_time_range?: number | undefined;
        end_percentage_of_time_range?: number | undefined;
        is_anchored?: boolean | undefined;
    } & {}>;
    type: "time_slider_control";
}> | Readonly<{
    width?: "small" | "medium" | "large" | undefined;
    grow?: boolean | undefined;
    uid?: string | undefined;
} & {
    config: Readonly<{
        title?: string | undefined;
        display_settings?: Readonly<{
            placeholder?: string | undefined;
            hide_action_bar?: boolean | undefined;
            hide_exclude?: boolean | undefined;
            hide_exists?: boolean | undefined;
            hide_sort?: boolean | undefined;
        } & {}> | undefined;
        single_select?: boolean | undefined;
        available_options?: string[] | undefined;
    } & {
        selected_options: string[];
        variable_name: string;
        variable_type: "values" | "fields" | "functions" | "time_literal" | "multi_values";
        esql_query: string;
        control_type: "STATIC_VALUES" | "VALUES_FROM_QUERY";
    }>;
    type: "esql_control";
}>)[]>;
