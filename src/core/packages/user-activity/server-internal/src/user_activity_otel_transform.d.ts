import type { OtelAttributesTransform, PluginAppenderConfigType } from '@kbn/core-logging-server';
/** Written onto the OTel resource AND used (via Object.keys) as the allowlist of resource keys to keep. */
export declare const getUserActivityOtelResourceAttributes: (isServerless: boolean, isElasticCloud: boolean) => Record<string, string>;
/** project.id would be dropped by the allowlist above, so it is copied onto every record instead. */
export declare const USER_ACTIVITY_OTEL_PROMOTE_RESOURCE_ATTRIBUTES: string[];
/** Shapes the flattened per-record attributes to the user activity requirements. */
export declare const applyUserActivityOtelFieldMap: OtelAttributesTransform;
/** Extends every `otel` appender with the user activity shaping above; others pass through. */
export declare const shapeUserActivityOtelAppenders: (appenders: ReadonlyMap<string, PluginAppenderConfigType>, isServerless: boolean, isElasticCloud: boolean) => Map<string, PluginAppenderConfigType>;
