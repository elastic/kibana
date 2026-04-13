import { TypeOf } from '@kbn/config-schema';
export declare const dashboardNavigationOptionsSchema: import("@kbn/config-schema").ObjectType<{
    use_filters: import("@kbn/config-schema").Type<boolean>;
    use_time_range: import("@kbn/config-schema").Type<boolean>;
    open_in_new_tab: import("@kbn/config-schema").Type<boolean>;
}>;
export type DashboardNavigationOptions = TypeOf<typeof dashboardNavigationOptionsSchema>;
