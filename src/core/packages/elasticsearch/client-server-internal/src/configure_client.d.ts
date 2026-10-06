/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { type OnRequestHandler } from './create_transport';
import type { AgentFactoryProvider } from './agent_manager';
export declare const configureClient: (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped,
    getExecutionContext,
    agentFactoryProvider,
    kibanaVersion,
    onRequest,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
    agentFactoryProvider: AgentFactoryProvider;
    kibanaVersion: string;
    onRequest: OnRequestHandler;
  }
) => Client;
