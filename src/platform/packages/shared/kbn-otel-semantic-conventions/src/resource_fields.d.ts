/**
 * The set of ECS (Elastic Common Schema) field names that are mapped to OpenTelemetry resource attributes, as defined by the OpenTelemetry Semantic Conventions.
 *
 * See https://github.com/elastic/elasticsearch/blob/main/modules/ingest-otel/src/main/java/org/elasticsearch/ingest/otel/EcsOTelResourceAttributes.java
 */
export declare const RESOURCE_ECS_FIELDS: string[];
export declare function prefixOTelField(ecsFieldName: string, otelFieldName?: string): string;
