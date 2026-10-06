import { type TypeOf } from '@kbn/config-schema';
/**
 * Configuration of the plugin `monitoring_collection`
 */
export type MonitoringCollectionConfig = TypeOf<typeof monitoringCollectionSchema>;
/**
 * Config schema of the plugin `monitoring_collection`.
 * @privateRemarks It needs to be defined here because it declares the configuration of some Metric Exporters,
 * and importing the config from the plugin would create a circular dependency.
 */
export declare const monitoringCollectionSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    opentelemetry: import("@kbn/config-schema").ObjectType<{
        metrics: import("@kbn/config-schema").ObjectType<{
            otlp: import("@kbn/config-schema").ObjectType<{
                url: import("@kbn/config-schema").Type<string | undefined>;
                headers: import("@kbn/config-schema").Type<Record<string, string> | undefined>;
                exportIntervalMillis: import("@kbn/config-schema").Type<number>;
                logLevel: import("@kbn/config-schema").Type<string>;
            }>;
            prometheus: import("@kbn/config-schema").ObjectType<{
                enabled: import("@kbn/config-schema").Type<boolean>;
            }>;
        }>;
    }>;
}>;
