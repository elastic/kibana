import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
/**
 * Registers the browser-side UI definition for the custom `esql.query_results` attachment type.
 * This controls how the attachment pill appears in the agent-builder chat:
 * - Label shows the truncated ES|QL query (e.g. "ES|QL results: from kibana_sample_data_logs")
 * - Icon uses the data table icon (visTable)
 *
 */
export declare const registerEsqlResultsAttachmentUi: (agentBuilder: AgentBuilderPluginStart) => void;
