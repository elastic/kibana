/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClientStatus } from './kbn_client_status';

export class KbnClientVersion {
  private versionCache: string | undefined;

  constructor(private readonly status: KbnClientStatus) {}

  async get() {
    if (this.versionCache !== undefined) {
      return this.versionCache;
    }

    const status = await this.status.get();

    if (!status.version) {
      throw new Error(
        `Unable to get version from Kibana, invalid response from server: ${JSON.stringify(status)}`
      );
    }

    this.versionCache = status.version.number + (status.version.build_snapshot ? '-SNAPSHOT' : '');
    return this.versionCache;
  }
}
