/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CloudService } from './cloud_service';
import type { CloudServiceResponseJson } from './cloud_response';

import { AWSCloudService } from './aws';
import { AzureCloudService } from './azure';
import { GCPCloudService } from './gcp';

const SUPPORTED_SERVICES = [AWSCloudService, AzureCloudService, GCPCloudService];

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
  private readonly cloudServices: CloudService[];
  private cloudDetails?: CloudServiceResponseJson;

  constructor(options: CloudDetectorOptions = {}) {
    this.cloudServices =
      options.cloudServices ?? SUPPORTED_SERVICES.map((Service) => new Service());
  }

  /**
   * Get any cloud details that we have detected.
   */
  getCloudDetails() {
    return this.cloudDetails;
  }

  /**
   * Asynchronously detect the cloud service.
   *
   * Callers are _not_ expected to await this method, which allows the
   * caller to trigger the lookup and then simply use it whenever we
   * determine it.
   */
  async detectCloudService() {
    this.cloudDetails = await this.getCloudService();
  }

  /**
   * Check every cloud service until the first one reports success from detection.
   */
  private async getCloudService() {
    // check each service until we find one that is confirmed to match;
    // order is assumed to matter
    for (const service of this.cloudServices) {
      try {
        const serviceResponse = await service.checkIfService();

        if (serviceResponse.isConfirmed()) {
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
