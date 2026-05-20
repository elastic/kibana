export { getAgentName, isOpenTelemetryAgentName, isEDOTAgentName, isOTELAgentName, hasOpenTelemetryPrefix, isJavaAgentName, isRumAgentName, isMobileAgentName, isRumOrMobileAgentName, isIosAgentName, isAndroidAgentName, isJRubyAgentName, isServerlessAgentName, isAWSLambdaAgentName, isAzureFunctionsAgentName, } from './src/agent_guards';
export { ELASTIC_AGENT_NAMES, OPEN_TELEMETRY_AGENT_NAMES, EDOT_AGENT_NAMES, OTEL_AGENT_NAMES, JAVA_AGENT_NAMES, RUM_AGENT_NAMES, SERVERLESS_TYPE, AGENT_NAMES, } from './src/agent_names';
export { getIngestionPath } from './src/agent_ingestion_path';
export { getSdkNameAndLanguage } from './src/agent_sdk_name_and_language';
export type { ElasticAgentName, OpenTelemetryAgentName, JavaAgentName, RumAgentName, ServerlessType, AgentName, } from './src/agent_names';
