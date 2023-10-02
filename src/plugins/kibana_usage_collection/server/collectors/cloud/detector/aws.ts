/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFile } from 'fs/promises';
import { get, omit } from 'lodash';
import fetch from 'node-fetch';
import { CloudService } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';

// We explicitly call out the version, 2016-09-02, rather than 'latest' to avoid unexpected changes
const SERVICE_ENDPOINT = 'http://169.254.169.254/2016-09-02/dynamic/instance-identity/document';

/** @internal */
export interface AWSResponse {
  accountId: string;
  architecture: string;
  availabilityZone: string;
  billingProducts: unknown;
  devpayProductCodes: unknown;
  marketplaceProductCodes: unknown;
  imageId: string;
  instanceId: string;
  instanceType: string;
  kernelId: unknown;
  pendingTime: string;
  privateIp: string;
  ramdiskId: unknown;
  region: string;
  version: string;
}

/**
 * Checks and loads the service metadata for an Amazon Web Service VM if it is available.
 *
 * @internal
 */
export class AWSCloudService extends CloudService {
  constructor() {
    super('aws');
  }
  /**
   * Parse the AWS response, if possible.
   *
   * Example payload:
   * {
   *   "accountId" : "1234567890",
   *   "architecture" : "x86_64",
   *   "availabilityZone" : "us-west-2c",
   *   "billingProducts" : null,
   *   "devpayProductCodes" : null,
   *   "imageId" : "ami-6df1e514",
   *   "instanceId" : "i-0c7a5b7590a4d811c",
   *   "instanceType" : "t2.micro",
   *   "kernelId" : null,
   *   "pendingTime" : "2017-07-06T02:09:12Z",
   *   "privateIp" : "10.0.0.38",
   *   "ramdiskId" : null,
   *   "region" : "us-west-2"
   *   "version" : "2010-08-31",
   * }
   */
  parseBody = (body: AWSResponse): CloudServiceResponse | null => {
    const name = this.getName();
    const id: string | undefined = get(body, 'instanceId');
    const vmType: string | undefined = get(body, 'instanceType');
    const region: string | undefined = get(body, 'region');
    const zone: string | undefined = get(body, 'availabilityZone');
    const metadata = omit(body, [
      // remove keys we already have
      'instanceId',
      'instanceType',
      'region',
      'availabilityZone',
      // remove keys that give too much detail
      'accountId',
      'billingProducts',
      'devpayProductCodes',
      'privateIp',
    ]);

    // ensure we actually have some data
    if (id || vmType || region || zone) {
      return new CloudServiceResponse(name, true, { id, vmType, region, zone, metadata });
    }

    return null;
  };

  private _isWindows = (): boolean => {
    return process.platform.startsWith('win');
  };

  protected _checkIfService = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(SERVICE_ENDPOINT, {
        method: 'GET',
        signal,
      });

      if (!response.ok || response.status === 404) {
        throw new Error('AWS request failed');
      }

      const jsonBody: AWSResponse = await response.json();
      return this._parseResponse(jsonBody, this.parseBody);
    } catch (_) {
      return this.tryToDetectUuid();
    }
  };

  /**
   * Attempt to load the UUID by checking `/sys/hypervisor/uuid`.
   *
   * This is a fallback option if the metadata service is unavailable for some reason.
   */
  private tryToDetectUuid = async () => {
    const isWindows = this._isWindows();
    // Windows does not have an easy way to check
    if (!isWindows) {
      const pathsToCheck = ['/sys/hypervisor/uuid', '/sys/devices/virtual/dmi/id/product_uuid'];
      const responses = await Promise.allSettled(
        pathsToCheck.map((path) => readFile(path, 'utf8'))
      );

      for (const response of responses) {
        let uuid;
        if (response.status === 'fulfilled' && typeof response.value === 'string') {
          // Some AWS APIs return it lowercase (like the file did in testing), while others return it uppercase
          uuid = response.value.trim().toLowerCase();

          // There is a small chance of a false positive here in the unlikely event that a uuid which doesn't
          // belong to ec2 happens to be generated with `ec2` as the first three characters.
          if (uuid.startsWith('ec2')) {
            return new CloudServiceResponse(this._name, true, { id: uuid });
          }
        }
      }

      return this._createUnconfirmedResponse();
    }

    return this._createUnconfirmedResponse();
  };
}
