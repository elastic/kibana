/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RpcTarget } from 'capnweb';
import { expose } from '@kbn/core-remote-common';

/** Exposes coordinator capabilities to the executor over the remote session. */
export class CoordinatorGateway extends RpcTarget {
  #capabilities: Map<string, RpcTarget>;

  constructor(coordinator: Map<string, object>) {
    super();
    this.#capabilities = new Map(
      [...coordinator.entries()].map(([id, instance]) => [id, expose(instance)])
    );
  }

  getCapability(tokenId: string): RpcTarget {
    const capability = this.#capabilities.get(tokenId);
    if (!capability) {
      throw new Error(`No coordinator capability bound for "${tokenId}"`);
    }
    return capability;
  }
}
