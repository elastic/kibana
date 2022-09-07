/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, omit } from 'lodash';
import fetch from 'node-fetch';
import { AbortSignal } from 'abort-controller';
import { CloudService } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';

// 2017-04-02 is the first GA release of this API
const SERVICE_ENDPOINT = 'http://169.254.169.254/metadata/instance?api-version=2017-04-02';

interface AzureResponse {
  compute?: Record<string, string>;
  network: unknown;
}

/**
 * Checks and loads the service metadata for an Azure VM if it is available.
 *
 * @internal
 */
export class AzureCloudService extends CloudService {
  constructor() {
    super('azure');
  }
  /**
   * Parse the Azure response, if possible.
   *
   * Azure VMs created using the "classic" method, as opposed to the resource manager,
   * do not provide a "compute" field / object. However, both report the "network" field / object.
   *
   * Example payload (with network object ignored):
   * {
   *   "compute": {
   *     "location": "eastus",
   *     "name": "my-ubuntu-vm",
   *     "offer": "UbuntuServer",
   *     "osType": "Linux",
   *     "platformFaultDomain": "0",
   *     "platformUpdateDomain": "0",
   *     "publisher": "Canonical",
   *     "sku": "16.04-LTS",
   *     "version": "16.04.201706191",
   *     "vmId": "d4c57456-2b3b-437a-9f1f-7082cfce02d4",
   *     "vmSize": "Standard_A1"
   *   },
   *   "network": {
   *     ...
   *   }
   * }
   */
  private parseBody = (body: AzureResponse): CloudServiceResponse | null => {
    const name = this.getName();
    const compute: Record<string, string> | undefined = get(body, 'compute');
    const id = get<Record<string, string>, string>(compute, 'vmId');
    const vmType = get<Record<string, string>, string>(compute, 'vmSize');
    const region = get<Record<string, string>, string>(compute, 'location');

    // remove keys that we already have; explicitly undefined so we don't send it when empty
    const metadata = compute ? omit(compute, ['vmId', 'vmSize', 'location']) : undefined;

    // we don't actually use network, but we check for its existence to see if this is a response from Azure
    const network = get(body, 'network');

    // ensure we actually have some data
    if (id || vmType || region) {
      return new CloudServiceResponse(name, true, { id, vmType, region, metadata });
    } else if (network) {
      // classic-managed VMs in Azure don't provide compute so we highlight the lack of info
      return new CloudServiceResponse(name, true, { metadata: { classic: true } });
    }

    return null;
  };

  protected _checkIfService = async (signal?: AbortSignal) => {
    const response = await fetch(SERVICE_ENDPOINT, {
      method: 'GET',
      headers: {
        // Azure requires this header
        Metadata: 'true',
      },
      signal,
    });

    if (!response.ok || response.status === 404) {
      throw new Error('Azure request failed');
    }

    const jsonBody: AzureResponse = await response.json();
    return this._parseResponse(jsonBody, this.parseBody);
  };
}
