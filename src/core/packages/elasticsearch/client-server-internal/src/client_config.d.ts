/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import type { AgentOptions } from 'https';
export type ParsedClientOptions = Omit<ClientOptions, 'agent'> & {
  agent: AgentOptions;
};
/**
 * Parse the client options from given client config and `scoped` flag.
 *
 * @param config The config to generate the client options from.
 * @param scoped if true, will adapt the configuration to be used by a scoped client
 *        (will remove basic auth and ssl certificates)
 */
export declare function parseClientOptions(
  config: ElasticsearchClientConfig,
  scoped: boolean,
  kibanaVersion: string
): ParsedClientOptions;
