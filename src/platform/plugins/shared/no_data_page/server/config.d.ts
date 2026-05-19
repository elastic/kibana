import type { TypeOf } from '@kbn/config-schema';
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    analyticsNoDataPageFlavor: import("@kbn/config-schema").ConditionalType<true, "kibana" | "serverless_search" | "serverless_observability", "kibana" | "serverless_search" | "serverless_observability">;
}>;
export type NoDataPageConfig = TypeOf<typeof configSchema>;
