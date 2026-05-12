/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { SearchHit } from '@kbn/es-types';
import type { AgentConfiguration } from '@kbn/apm-agent-configuration';
import { serviceRt } from '@kbn/apm-agent-configuration';
import { defineRoute } from '../types';

const searchParamsRt = t.intersection([
  t.type({ service: serviceRt }),
  t.partial({ etag: t.string, mark_as_applied_by_agent: t.boolean, error: t.string }),
]);

export type AgentConfigSearchParams = t.TypeOf<typeof searchParamsRt>;

export type SearchAgentConfigurationResponse = SearchHit<
  AgentConfiguration,
  undefined,
  undefined
> | null;

export const searchAgentConfigurationRoute = defineRoute<SearchAgentConfigurationResponse>()({
  endpoint: 'POST /api/apm/settings/agent-configuration/search 2023-10-31',
  params: t.type({
    body: searchParamsRt,
  }),
});
