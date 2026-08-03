import type { AgentName, ElasticAgentName } from '@kbn/elastic-agent-utils/src/agent_names';
type OtelLanguage = 'webjs' | 'swift' | 'android' | 'cpp' | 'erlang' | 'rust';
type SyncBadgeAgentName = ElasticAgentName | OtelLanguage;
/**
 * Maps agent names and language names to their expected sync behavior.
 * Includes Elastic agent names and OTEL language names.
 *
 * true: Language natively operates synchronously (e.g., Node.js, browser JS)
 * false: Language natively operates asynchronously (e.g., Python, PHP, Go)
 */
export declare const agentsSyncMap: Map<SyncBadgeAgentName, boolean>;
/**
 * Gets the sync behavior value for any agent (Elastic, OTEL, or EDOT).
 * Returns undefined if the agent is not recognized.
 *
 * @param agentName - The agent name (e.g., 'nodejs', 'opentelemetry/java', 'otlp/python/elastic')
 * @returns true for sync agents, false for async agents, undefined if unknown
 */
export declare function getAgentSyncValue(agentName: AgentName): boolean | undefined;
export {};
