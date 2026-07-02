export declare const dashboardDrilldownSchema: import("@kbn/config-schema").ObjectType<Omit<{
    use_filters: import("@kbn/config-schema").Type<boolean>;
    use_time_range: import("@kbn/config-schema").Type<boolean>;
    open_in_new_tab: import("@kbn/config-schema").Type<boolean>;
}, "dashboard_id"> & {
    dashboard_id: import("@kbn/config-schema").Type<string>;
}>;
