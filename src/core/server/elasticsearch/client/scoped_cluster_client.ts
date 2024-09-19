/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from './types';

/**
 * Serves the same purpose as the normal {@link IClusterClient | cluster client} but exposes
 * an additional `asCurrentUser` method that doesn't use credentials of the Kibana internal
 * user (as `asInternalUser` does) to request Elasticsearch API, but rather passes HTTP headers
 * extracted from the current user request to the API instead.
 *
 * @public
 **/
export interface IScopedClusterClient {
  /**
   * A {@link ElasticsearchClient | client} to be used to query the elasticsearch cluster
   * on behalf of the internal Kibana user.
   */
  readonly asInternalUser: ElasticsearchClient;
  /**
   * A {@link ElasticsearchClient | client} to be used to query the elasticsearch cluster
   * on behalf of the user that initiated the request to the Kibana server.
   */
  readonly asCurrentUser: ElasticsearchClient;
}

/** @internal **/
export class ScopedClusterClient implements IScopedClusterClient {
  constructor(
    public readonly asInternalUser: ElasticsearchClient,
    public readonly asCurrentUser: ElasticsearchClient
  ) {}
}
