/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from './router';

/**
 * Config for a partial basePath value that is specific to a request.
 * Partial basePath means that mulitple basePath values can be applied to a single request
 * and they will be concatenated in the order of their index.
 *
 * @public
 */
export interface PartialBasePathValue {
  /** A unique id for this basePath value */
  id: string;
  /** The partial base path string value */
  basePath: string;
  /** The index of the partial, lower means comes before other base path declared */
  index: number;
}

/**
 * Access or manipulate the Kibana base path
 *
 * @public
 */
export interface IBasePath {
  /**
   * returns the server's basePath.
   *
   * See {@link IBasePath.get} for getting the basePath value for a specific request
   */
  readonly serverBasePath: string;

  /**
   * The server's publicly exposed base URL, if configured. Includes protocol, host, port (optional) and the
   * {@link IBasePath.serverBasePath}.
   *
   * @remarks
   * Should be used for generating external URL links back to this Kibana instance.
   */
  readonly publicBaseUrl?: string;

  /**
   * returns `basePath` value, specific for an incoming request.
   */
  get(request: KibanaRequest): string;

  /**
   * sets `basePath` value, specific for an incoming request.
   */
  set(request: KibanaRequest, requestSpecificBasePath: string | PartialBasePathValue): void;

  /**
   * Prepends `path` with the basePath.
   */
  prepend(path: string): string;

  /**
   * Removes the prepended basePath from the `path`.
   */
  remove(path: string): string;
}
