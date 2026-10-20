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
import type { Headers } from '@kbn/core-http-server';
import type {
  AsScopedOptions,
  ElasticsearchClientConfig,
  IClusterClient,
  ScopeableRequest,
} from '@kbn/core-elasticsearch-server';
import { configureClient } from './configure_client';
import type { AgentFactoryProvider } from './agent_manager';
import { getRequestHandlerFactory } from './cps_request_handler';
import type { OnRequestHandlerFactory } from './cluster_client';

export interface ResearchRouting {
  readonly enabled: boolean;
  readonly expression: string;
}

export interface ResearchEsCapability {
  readonly version: 1;
  readonly mode: 'current' | 'internal' | 'secondary';
  readonly config: ElasticsearchClientConfig;
  readonly headers?: Headers;
  readonly kibanaVersion: string;
  readonly executionContext?: string;
  readonly routing: ResearchRouting;
}

type Capture = (
  request: ScopeableRequest,
  mode: ResearchEsCapability['mode'],
  options?: AsScopedOptions
) => ResearchEsCapability;

const captures = new WeakMap<IClusterClient, Capture>();
const routingFactories = new WeakMap<
  OnRequestHandlerFactory,
  (request: ScopeableRequest, options?: AsScopedOptions) => ResearchRouting
>();

/** Removes internal credentials that Core's scoped configuration would never use. */
export const restrictResearchEsConfig = (
  config: ElasticsearchClientConfig,
  scoped: boolean
): ElasticsearchClientConfig => {
  if (!scoped) return config;
  const { username, password, serviceAccountToken, ssl, ...rest } = config;
  if (!ssl || ssl.alwaysPresentCertificate) return { ...rest, ssl };
  const { certificate, key, keyPassphrase, ...scopedSsl } = ssl;
  return { ...rest, ssl: scopedSsl };
};

/** Registers a private research seam without changing the public Core client contract. */
export const registerResearchEsCapture = (client: IClusterClient, capture: Capture): void => {
  if (process.env.KBN_RESEARCH_CAPABILITY_KIT === 'true') captures.set(client, capture);
};

/** Attaches the same private capture to Core's public start-contract facade. */
export const registerResearchEsAlias = <T extends IClusterClient>(
  alias: T,
  source: IClusterClient
): T => {
  const capture = captures.get(source);
  if (process.env.KBN_RESEARCH_CAPABILITY_KIT === 'true' && capture) captures.set(alias, capture);
  return alias;
};

/** Records Core's actual CPS configuration; unknown/custom factories fail closed. */
export const registerResearchRouting = (
  factory: OnRequestHandlerFactory,
  resolve: (request: ScopeableRequest, options?: AsScopedOptions) => ResearchRouting
): void => {
  if (process.env.KBN_RESEARCH_CAPABILITY_KIT === 'true') routingFactories.set(factory, resolve);
};

/** Captures the exact Core routing policy rather than guessing from request headers. */
export const captureResearchRouting = (
  factory: OnRequestHandlerFactory,
  request: ScopeableRequest,
  options?: AsScopedOptions
): ResearchRouting => {
  const resolve = routingFactories.get(factory);
  if (!resolve) throw new Error('Research ES capability: unknown routing factory');
  return resolve(request, options);
};

/** Captures resolved credentials in memory only; callers must never persist this value. */
export const captureResearchEsCapability = (
  client: IClusterClient,
  request: ScopeableRequest,
  mode: ResearchEsCapability['mode'] = 'current',
  options?: AsScopedOptions
): ResearchEsCapability => {
  if (process.env.KBN_RESEARCH_CAPABILITY_KIT !== 'true')
    throw new Error('Research ES capability kit is disabled');
  const capture = captures.get(client);
  if (!capture) throw new Error('Research ES capability kit is disabled or client is unsupported');
  return capture(request, mode, options);
};

/** Reconstructs Core's transport and CPS algorithms in the owning isolate. */
export const createResearchEsClient = (
  capability: ResearchEsCapability,
  logger: Logger,
  agentFactoryProvider: AgentFactoryProvider
): Client => {
  if (capability.version !== 1) throw new Error('Unsupported research ES capability version');
  const { config, headers, mode, kibanaVersion, executionContext, routing } = capability;
  const factory = getRequestHandlerFactory(routing.enabled, false);
  const client = configureClient(config, {
    scoped: mode === 'current',
    logger,
    type: 'research-capability',
    getExecutionContext: () => executionContext,
    agentFactoryProvider,
    kibanaVersion,
    onRequest: factory({
      logger,
      projectRouting: 'expression',
      value: routing.expression,
    }),
  });
  return headers ? client.child({ headers }) : client;
};
