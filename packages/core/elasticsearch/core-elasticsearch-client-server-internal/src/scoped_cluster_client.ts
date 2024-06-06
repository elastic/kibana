/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';

/** @internal **/
export class ScopedClusterClient implements IScopedClusterClient {
  public readonly asInternalUser;

  readonly #asCurrentUserClientFactory: () => ElasticsearchClient;
  readonly #asSecondaryAuthClientFactory: () => ElasticsearchClient;

  #asCurrentUserClient?: ElasticsearchClient;
  #asSecondaryAuthClient?: ElasticsearchClient;

  constructor({
    asInternalUser,
    asCurrentUserClientFactory,
    asSecondaryAuthClientFactory,
  }: {
    asInternalUser: ElasticsearchClient;
    asCurrentUserClientFactory: () => ElasticsearchClient;
    asSecondaryAuthClientFactory: () => ElasticsearchClient;
  }) {
    this.asInternalUser = asInternalUser;
    this.#asCurrentUserClientFactory = asCurrentUserClientFactory;
    this.#asSecondaryAuthClientFactory = asSecondaryAuthClientFactory;
  }

  public get asCurrentUser() {
    if (this.#asCurrentUserClient === undefined) {
      this.#asCurrentUserClient = this.#asCurrentUserClientFactory();
    }
    return this.#asCurrentUserClient;
  }

  public get asSecondaryAuth() {
    if (this.#asSecondaryAuthClient === undefined) {
      this.#asSecondaryAuthClient = this.#asSecondaryAuthClientFactory();
    }
    return this.#asSecondaryAuthClient;
  }
}
