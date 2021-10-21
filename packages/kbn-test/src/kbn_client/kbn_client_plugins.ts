/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KbnClientStatus } from './kbn_client_status';

export class KbnClientPlugins {
  constructor(private readonly status: KbnClientStatus) {}
  /**
   * Get a list of plugin ids that are enabled on the server
   */
  public async getEnabledIds() {
    const apiResp = await this.status.get();

    // Status may not be available at the `preboot` stage.
    return Object.keys(apiResp.status?.plugins ?? {});
  }
}
