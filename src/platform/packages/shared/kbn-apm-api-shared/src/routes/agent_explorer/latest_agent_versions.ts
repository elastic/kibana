/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  AgentName,
  ElasticApmAgentLatestVersion,
  OtelAgentLatestVersion,
} from '@kbn/apm-types';
import { defineRoute } from '../types';

type AgentLatestVersions = Record<AgentName, ElasticApmAgentLatestVersion | OtelAgentLatestVersion>;

export interface AgentLatestVersionsResponse {
  data: AgentLatestVersions;
  error?: { message: string; type?: string; statusCode?: string };
}

export const latestAgentVersionsRoute = defineRoute<AgentLatestVersionsResponse>()({
  endpoint: 'GET /internal/apm/get_latest_agent_versions',
});
