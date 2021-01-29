/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { intersection, isObject } from 'lodash';
import { Headers } from '../../http/router';
import { LegacyAPICaller, LegacyCallAPIOptions } from './api_types';

/**
 * Serves the same purpose as "normal" `ClusterClient` but exposes additional
 * `callAsCurrentUser` method that doesn't use credentials of the Kibana internal
 * user (as `callAsInternalUser` does) to request Elasticsearch API, but rather
 * passes HTTP headers extracted from the current user request to the API.
 *
 * See {@link LegacyScopedClusterClient}.
 *
 * @deprecated Use {@link IScopedClusterClient}.
 * @public
 */
export type ILegacyScopedClusterClient = Pick<
  LegacyScopedClusterClient,
  'callAsCurrentUser' | 'callAsInternalUser'
>;

/**
 * {@inheritDoc IScopedClusterClient}
 * @deprecated Use {@link IScopedClusterClient | scoped cluster client}.
 * @public
 */
export class LegacyScopedClusterClient implements ILegacyScopedClusterClient {
  constructor(
    private readonly internalAPICaller: LegacyAPICaller,
    private readonly scopedAPICaller: LegacyAPICaller,
    private readonly headers?: Headers
  ) {
    this.callAsCurrentUser = this.callAsCurrentUser.bind(this);
    this.callAsInternalUser = this.callAsInternalUser.bind(this);
  }

  /**
   * Calls specified `endpoint` with provided `clientParams` on behalf of the
   * Kibana internal user.
   * See {@link LegacyAPICaller}.
   * @deprecated Use {@link IScopedClusterClient.asInternalUser}.
   *
   * @param endpoint - String descriptor of the endpoint e.g. `cluster.getSettings` or `ping`.
   * @param clientParams - A dictionary of parameters that will be passed directly to the Elasticsearch JS client.
   * @param options - Options that affect the way we call the API and process the result.
   */
  public callAsInternalUser(
    endpoint: string,
    clientParams: Record<string, any> = {},
    options?: LegacyCallAPIOptions
  ) {
    return this.internalAPICaller(endpoint, clientParams, options);
  }

  /**
   * Calls specified `endpoint` with provided `clientParams` on behalf of the
   * user initiated request to the Kibana server (via HTTP request headers).
   * See {@link LegacyAPICaller}.
   * @deprecated Use {@link IScopedClusterClient.asCurrentUser}.
   *
   * @param endpoint - String descriptor of the endpoint e.g. `cluster.getSettings` or `ping`.
   * @param clientParams - A dictionary of parameters that will be passed directly to the Elasticsearch JS client.
   * @param options - Options that affect the way we call the API and process the result.
   */
  public callAsCurrentUser(
    endpoint: string,
    clientParams: Record<string, any> = {},
    options?: LegacyCallAPIOptions
  ) {
    const defaultHeaders = this.headers;
    if (defaultHeaders !== undefined) {
      const customHeaders: any = clientParams.headers;
      if (isObject(customHeaders)) {
        const duplicates = intersection(Object.keys(defaultHeaders), Object.keys(customHeaders));
        duplicates.forEach((duplicate) => {
          if (defaultHeaders[duplicate] !== (customHeaders as any)[duplicate]) {
            throw Error(`Cannot override default header ${duplicate}.`);
          }
        });
      }

      clientParams.headers = Object.assign({}, clientParams.headers, this.headers);
    }

    return this.scopedAPICaller(endpoint, clientParams, options);
  }
}
