/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch, { Response } from 'node-fetch';
import { AbortSignal } from 'abort-controller';
import { CloudService } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';

// GCP documentation shows both 'metadata.google.internal' (mostly) and '169.254.169.254' (sometimes)
// To bypass potential DNS changes, the IP was used because it's shared with other cloud services
const SERVICE_ENDPOINT = 'http://169.254.169.254/computeMetadata/v1/instance';
// GCP required headers
const SERVICE_HEADERS = { 'Metadata-Flavor': 'Google' };

/**
 * Checks and loads the service metadata for an Google Cloud Platform VM if it is available.
 *
 * @internal
 */
export class GCPCloudService extends CloudService {
  constructor() {
    super('gcp');
  }

  protected _checkIfService = async (signal?: AbortSignal) => {
    // we need to call GCP individually for each field we want metadata for
    const fields = ['id', 'machine-type', 'zone'];

    const settledResponses = await Promise.allSettled(
      fields.map(async (field) => {
        return await fetch(`${SERVICE_ENDPOINT}/${field}`, {
          method: 'GET',
          headers: { ...SERVICE_HEADERS },
          signal,
        });
      })
    );

    const hasValidResponses = settledResponses.some(this.isValidResponse);

    if (!hasValidResponses) {
      throw new Error('GCP request failed');
    }

    // Note: there is no fallback option for GCP;
    // responses are arrays containing [fullResponse, body];
    // because GCP returns plaintext, we have no way of validating
    // without using the response code.
    const [id, machineType, zone] = await Promise.all(
      settledResponses.map(async (settledResponse) => {
        if (this.isValidResponse(settledResponse)) {
          // GCP does _not_ return JSON
          return await settledResponse.value.text();
        }
      })
    );

    return this.combineResponses(id, machineType, zone);
  };

  private isValidResponse = (
    settledResponse: PromiseSettledResult<Response>
  ): settledResponse is PromiseFulfilledResult<Response> => {
    if (settledResponse.status === 'rejected') {
      return false;
    }
    const { value } = settledResponse;
    return value.ok && value.status !== 404 && value.headers.get('metadata-flavor') === 'Google';
  };

  /**
   * Parse the GCP responses, if possible.
   *
   * Example values for each parameter:
   *
   * vmId: '5702733457649812345'
   * machineType: 'projects/441331612345/machineTypes/f1-micro'
   * zone: 'projects/441331612345/zones/us-east4-c'
   */
  private combineResponses = (id?: string, machineType?: string, zone?: string) => {
    const vmId = typeof id === 'string' ? id.trim() : undefined;
    const vmType = this.extractValue('machineTypes/', machineType);
    const vmZone = this.extractValue('zones/', zone);
    const region = vmZone ? vmZone.substring(0, vmZone.lastIndexOf('-')) : undefined;

    // ensure we actually have some data
    if (vmId || vmType || region || vmZone) {
      return new CloudServiceResponse(this._name, true, { id: vmId, vmType, region, zone: vmZone });
    }

    throw new Error('unrecognized responses');
  };

  /**
   * Extract the useful information returned from GCP while discarding
   * unwanted account details (the project ID).
   *
   * For example, this turns something like
   * 'projects/441331612345/machineTypes/f1-micro' into 'f1-micro'.
   */
  private extractValue = (fieldPrefix: string, value?: string) => {
    if (typeof value !== 'string') {
      return;
    }

    const index = value.lastIndexOf(fieldPrefix);

    if (index !== -1) {
      return value.substring(index + fieldPrefix.length).trim();
    }
  };
}
