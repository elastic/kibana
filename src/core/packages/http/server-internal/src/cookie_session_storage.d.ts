/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Server } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { SessionStorageFactory, SessionStorageCookieOptions } from '@kbn/core-http-server';
/**
 * Creates SessionStorage factory, which abstract the way of
 * session storage implementation and scoping to the incoming requests.
 *
 * @param log - logger instance
 * @param server - hapi server to create SessionStorage for
 * @param cookieOptions - cookies configuration
 * @param disableEmbedding - whether embedding is disabled
 * @param basePath - optional base path for the Kibana server
 */
export declare function createCookieSessionStorageFactory<T extends object>(
  log: Logger,
  server: Server,
  cookieOptions: SessionStorageCookieOptions<T>,
  disableEmbedding: boolean,
  basePath?: string
): Promise<SessionStorageFactory<T>>;
