/**
 * We cannot mark these arrays as const and derive their type
 * because we need to be able to assign them as mutable entities for ES queries.
 */
export type ElasticAgentName = 'dotnet' | 'go' | 'iOS/swift' | 'java' | 'js-base' | 'nodejs' | 'php' | 'python' | 'ruby' | 'rum-js' | 'android/java';
export declare const ELASTIC_AGENT_NAMES: ElasticAgentName[];
export type OpenTelemetryAgentName = 'opentelemetry' | 'otlp' | `opentelemetry/${string}` | `otlp/${string}`;
export declare const OPEN_TELEMETRY_BASE_AGENT_NAMES: OpenTelemetryAgentName[];
export declare const OPEN_TELEMETRY_AGENT_NAMES: OpenTelemetryAgentName[];
export declare const EDOT_AGENT_NAMES: OpenTelemetryAgentName[];
export declare const OTEL_AGENT_NAMES: OpenTelemetryAgentName[];
export type JavaAgentName = 'java' | 'opentelemetry/java' | 'otlp/java';
export declare const JAVA_AGENT_NAMES: JavaAgentName[];
export type RumAgentName = 'js-base' | 'rum-js' | 'opentelemetry/webjs' | 'otlp/webjs';
export declare const RUM_AGENT_NAMES: RumAgentName[];
export type AndroidAgentName = 'android/java' | 'opentelemetry/android' | 'otlp/android';
export declare const ANDROID_AGENT_NAMES: AndroidAgentName[];
export type IOSAgentName = 'ios/swift' | 'opentelemetry/swift' | 'otlp/swift';
export declare const IOS_AGENT_NAMES: IOSAgentName[];
export type ServerlessType = 'aws.lambda' | 'azure.functions';
export declare const SERVERLESS_TYPE: ServerlessType[];
export type AgentName = ElasticAgentName | OpenTelemetryAgentName | JavaAgentName | RumAgentName | AndroidAgentName | IOSAgentName;
export declare const AGENT_NAMES: AgentName[];
