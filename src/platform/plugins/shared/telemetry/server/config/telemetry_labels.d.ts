import type { TypeOf } from '@kbn/config-schema';
/**
 * Labels to enrich the context of the telemetry generated.
 * When adding new keys, bear in mind that this info is exposed
 * to the browser **even to unauthenticated pages**.
 */
export declare const labelsSchema: import("@kbn/config-schema").ObjectType<{
    branch: import("@kbn/config-schema").Type<string | undefined>;
    ciBuildJobId: import("@kbn/config-schema").Type<string | undefined>;
    ciBuildId: import("@kbn/config-schema").Type<string | undefined>;
    ciBuildNumber: import("@kbn/config-schema").Type<number | undefined>;
    environment: import("@kbn/config-schema").Type<string | undefined>;
    ftrConfig: import("@kbn/config-schema").Type<string | undefined>;
    gitRev: import("@kbn/config-schema").Type<string | undefined>;
    isPr: import("@kbn/config-schema").Type<boolean | undefined>;
    prId: import("@kbn/config-schema").Type<number | undefined>;
    journeyName: import("@kbn/config-schema").Type<string | undefined>;
    testBuildId: import("@kbn/config-schema").Type<string | undefined>;
    testJobId: import("@kbn/config-schema").Type<string | undefined>;
    ciBuildName: import("@kbn/config-schema").Type<string | undefined>;
    performancePhase: import("@kbn/config-schema").Type<string | undefined>;
    /**
     * The serverless project type.
     * Flagging it as maybe because these settings should never affect how Kibana runs.
     */
    serverless: import("@kbn/config-schema").ConditionalType<true, string | undefined, string | undefined>;
}>;
export type TelemetryConfigLabels = TypeOf<typeof labelsSchema>;
