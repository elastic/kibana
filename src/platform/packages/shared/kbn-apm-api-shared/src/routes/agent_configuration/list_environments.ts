/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';

export type AgentConfigurationEnvironmentsResponse = Array<{
  name: string;
  alreadyConfigured: boolean;
}>;

export interface ListAgentConfigurationEnvironmentsResponse {
  environments: AgentConfigurationEnvironmentsResponse;
}

export const listAgentConfigurationEnvironmentsRoute =
  defineRoute<ListAgentConfigurationEnvironmentsResponse>()({
    endpoint: 'GET /api/apm/settings/agent-configuration/environments 2023-10-31',
    params: t.partial({
      query: t.partial({ serviceName: t.string }),
    }),
  });
