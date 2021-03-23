/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CloudService } from './cloud_service';
import type { CloudServiceResponseJson } from './cloud_response';
import { CLOUD_SERVICES } from './cloud_services';

interface CloudDetectorOptions {
  cloudServices?: CloudService[];
}

/**
 * The `CloudDetector` can be used to asynchronously detect the
 * cloud service that Kibana is running within.
 *
 * @internal
 */
export class CloudDetector {
  private readonly _cloudServices: CloudService[];
  private _cloudDetails?: CloudServiceResponseJson;

  constructor(options: CloudDetectorOptions = {}) {
    const { cloudServices = CLOUD_SERVICES } = options;

    this._cloudServices = cloudServices;
    // Explicitly undefined. If the value is never updated, then
    // the property will be dropped when the data is serialized.
    this._cloudDetails = undefined;
  }

  /**
   * Get any cloud details that we have detected.
   */
  getCloudDetails() {
    return this._cloudDetails;
  }

  /**
   * Asynchronously detect the cloud service.
   *
   * Callers are _not_ expected to await this method, which allows the
   * caller to trigger the lookup and then simply use it whenever we
   * determine it.
   */
  async detectCloudService() {
    this._cloudDetails = await this._getCloudService(this._cloudServices);
  }

  /**
   * Check every cloud service until the first one reports success from detection.
   */
  async _getCloudService(cloudServices: CloudService[]) {
    // check each service until we find one that is confirmed to match;
    // order is assumed to matter
    for (const service of cloudServices) {
      try {
        const serviceResponse = await service.checkIfService();

        if (serviceResponse?.isConfirmed()) {
          return serviceResponse.toJSON();
        }
      } catch (ignoredError) {
        // ignored until we make wider use of this in the UI
      }
    }

    // explicitly undefined rather than null so that it can be ignored in JSON
    return undefined;
  }
}
