import type { TypeOf, Type } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
declare const configSchema: import("@kbn/config-schema").ObjectType<Omit<{
    enabled: Type<boolean>;
    allowChangingOptInStatus: Type<boolean>;
    hidePrivacyStatement: Type<boolean>;
    optIn: Type<boolean>;
    config: Type<string>;
    banner: Type<boolean>;
    sendUsageTo: import("@kbn/config-schema").ConditionalType<Type<false>, "prod" | "staging", "prod" | "staging">;
    sendUsageFrom: Type<"browser" | "server">;
    appendServerlessChannelsSuffix: import("@kbn/config-schema").ConditionalType<true, boolean, boolean>;
    labels: import("@kbn/config-schema").ObjectType<{
        branch: Type<string | undefined>;
        ciBuildJobId: Type<string | undefined>;
        ciBuildId: Type<string | undefined>;
        ciBuildNumber: Type<number | undefined>;
        environment: Type<string | undefined>;
        ftrConfig: Type<string | undefined>;
        gitRev: Type<string | undefined>;
        isPr: Type<boolean | undefined>;
        prId: Type<number | undefined>;
        journeyName: Type<string | undefined>;
        testBuildId: Type<string | undefined>;
        testJobId: Type<string | undefined>;
        ciBuildName: Type<string | undefined>;
        performancePhase: Type<string | undefined>;
        serverless: import("@kbn/config-schema").ConditionalType<true, string | undefined, string | undefined>;
    }>;
    localShipper: import("@kbn/config-schema").ConditionalType<Type<false>, boolean, false>;
}, "enabled" | "metrics" | "tracing"> & {
    enabled: Type<boolean>;
    metrics: Type<import("@kbn/metrics-config").MetricsConfig>;
    tracing: Type<import("@kbn/tracing-config").TracingConfig>;
}>;
export type TelemetryConfigType = TypeOf<typeof configSchema>;
export declare const config: PluginConfigDescriptor<TelemetryConfigType>;
export {};
