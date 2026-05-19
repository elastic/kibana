import type { AGENT_BUILDER_APP_ID } from './constants';
export type AgentBuilderApp = typeof AGENT_BUILDER_APP_ID;
export type AgentBuilderLinkId = 'conversations' | 'tools' | 'agents' | 'agents_create';
export type DeepLinkId = AgentBuilderApp | `${AgentBuilderApp}:${AgentBuilderLinkId}`;
