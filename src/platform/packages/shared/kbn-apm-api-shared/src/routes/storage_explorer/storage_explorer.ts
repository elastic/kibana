/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt, indexLifecyclePhaseRt } from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, probabilityRt } from '../../default_api_types';

export type StorageExplorerServiceStatisticsResponse = Array<{
  serviceName: string;
  sampling: number;
  environments: string[];
  size: number;
  agentName: AgentName;
}>;

export interface StorageExplorerRouteResponse {
  serviceStatistics: StorageExplorerServiceStatisticsResponse;
}

export const storageExplorerRoute = defineRoute<StorageExplorerRouteResponse>()({
  endpoint: 'GET /internal/apm/storage_explorer',
  params: t.type({
    query: t.intersection([indexLifecyclePhaseRt, probabilityRt, environmentRt, kueryRt, rangeRt]),
  }),
});
