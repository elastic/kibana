/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreService } from 'src/core/types';
import { CoreSetup } from 'src/core/public';
import { DeprecationsClient } from './deprecations_client';

/**
 * DeprecationsService provides methods to fetch plugin deprecation details from
 * the Kibana server.
 *
 * @public
 */
export interface DeprecationsServiceSetup {
  /**
   * Grabs deprecations for all plugins.
   *
   * @param {Object} configs { skipCache: boolean };
   * set skipCache: true to fetch a fresh copy of the deprecations from the kibana server.
   */
  getAllDeprecations: DeprecationsClient['getAllDeprecations'];
  /**
   * Grabs deprecations for a specific plugin.
   *
   * @param {string} pluginId
   * @param {Object} configs { skipCache: boolean };
   * set skipCache: true to fetch a fresh copy of the deprecations from the kibana server.
   */
  getDeprecations: DeprecationsClient['getDeprecations'];
}

/**
 * DeprecationsService provides methods to fetch plugin deprecation details from
 * the Kibana server.
 *
 * @public
 */
export type DeprecationsServiceStart = DeprecationsServiceSetup;

export class DeprecationsService
  implements CoreService<DeprecationsServiceSetup, DeprecationsServiceStart> {
  private deprecationsClient?: DeprecationsClient;

  public setup({ http }: Pick<CoreSetup, 'http'>): DeprecationsServiceSetup {
    this.deprecationsClient = new DeprecationsClient({ http });
    return {
      getAllDeprecations: this.deprecationsClient.getAllDeprecations,
      getDeprecations: this.deprecationsClient.getDeprecations,
    };
  }

  public start(): DeprecationsServiceStart {
    if (!this.deprecationsClient) {
      throw new Error('#setup must be called first.');
    }

    return {
      getAllDeprecations: this.deprecationsClient.getAllDeprecations,
      getDeprecations: this.deprecationsClient.getDeprecations,
    };
  }

  public stop() {
    if (this.deprecationsClient) {
      this.deprecationsClient.clearCache();
    }
  }
}
