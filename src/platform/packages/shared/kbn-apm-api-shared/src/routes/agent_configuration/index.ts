/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { listAgentConfigurationsRoute } from './list_configurations';
import { getSingleAgentConfigurationRoute } from './get_single_configuration';
import { deleteAgentConfigurationRoute } from './delete_configuration';
import { createOrUpdateAgentConfigurationRoute } from './create_or_update_configuration';
import { searchAgentConfigurationRoute } from './search_configuration';
import { listAgentConfigurationEnvironmentsRoute } from './list_environments';
import { agentConfigurationAgentNameRoute } from './get_agent_name';

export const agentConfigurationRouteDefinitions = {
  list: listAgentConfigurationsRoute,
  getSingle: getSingleAgentConfigurationRoute,
  delete: deleteAgentConfigurationRoute,
  createOrUpdate: createOrUpdateAgentConfigurationRoute,
  search: searchAgentConfigurationRoute,
  listEnvironments: listAgentConfigurationEnvironmentsRoute,
  agentName: agentConfigurationAgentNameRoute,
};

export type { ListAgentConfigurationsResponse } from './list_configurations';
export type { GetSingleAgentConfigurationResponse } from './get_single_configuration';
export type { DeleteAgentConfigurationResponse } from './delete_configuration';
export type {
  AgentConfigSearchParams,
  SearchAgentConfigurationResponse,
} from './search_configuration';
export type {
  AgentConfigurationEnvironmentsResponse,
  ListAgentConfigurationEnvironmentsResponse,
} from './list_environments';
export type { AgentConfigurationAgentNameResponse } from './get_agent_name';
