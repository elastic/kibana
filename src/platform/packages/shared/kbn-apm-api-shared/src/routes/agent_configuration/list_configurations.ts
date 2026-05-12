/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AgentConfiguration } from '@kbn/apm-agent-configuration';
import { defineRoute } from '../types';

export interface ListAgentConfigurationsResponse {
  configurations: AgentConfiguration[];
}

export const listAgentConfigurationsRoute = defineRoute<ListAgentConfigurationsResponse>()({
  endpoint: 'GET /api/apm/settings/agent-configuration 2023-10-31',
});
