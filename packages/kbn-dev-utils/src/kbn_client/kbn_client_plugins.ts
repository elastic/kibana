/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KbnClientStatus } from './kbn_client_status';

const PLUGIN_STATUS_ID = /^plugin:(.+?)@/;

export class KbnClientPlugins {
  constructor(private readonly status: KbnClientStatus) {}
  /**
   * Get a list of plugin ids that are enabled on the server
   */
  public async getEnabledIds() {
    const pluginIds: string[] = [];
    const apiResp = await this.status.get();

    for (const status of apiResp.status.statuses) {
      if (status.id) {
        const match = status.id.match(PLUGIN_STATUS_ID);
        if (match) {
          pluginIds.push(match[1]);
        }
      }
    }

    return pluginIds;
  }
}
