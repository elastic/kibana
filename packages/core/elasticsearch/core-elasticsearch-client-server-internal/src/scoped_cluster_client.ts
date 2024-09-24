/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';

/** @internal **/
export class ScopedClusterClient implements IScopedClusterClient {
  public readonly asInternalUser;

  readonly #asCurrentUserFactory: () => ElasticsearchClient;
  readonly #asSecondaryAuthUserFactory: () => ElasticsearchClient;

  #asCurrentUserClient?: ElasticsearchClient;
  #asSecondaryAuthUserClient?: ElasticsearchClient;

  constructor({
    asInternalUser,
    asCurrentUserFactory,
    asSecondaryAuthUserFactory,
  }: {
    asInternalUser: ElasticsearchClient;
    asCurrentUserFactory: () => ElasticsearchClient;
    asSecondaryAuthUserFactory: () => ElasticsearchClient;
  }) {
    this.asInternalUser = asInternalUser;
    this.#asCurrentUserFactory = asCurrentUserFactory;
    this.#asSecondaryAuthUserFactory = asSecondaryAuthUserFactory;
  }

  public get asCurrentUser() {
    if (this.#asCurrentUserClient === undefined) {
      this.#asCurrentUserClient = this.#asCurrentUserFactory();
    }
    return this.#asCurrentUserClient;
  }

  public get asSecondaryAuthUser() {
    if (this.#asSecondaryAuthUserClient === undefined) {
      this.#asSecondaryAuthUserClient = this.#asSecondaryAuthUserFactory();
    }
    return this.#asSecondaryAuthUserClient;
  }
}
