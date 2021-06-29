/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isString } from 'lodash';
import { promisify } from 'util';
import { CloudService, CloudServiceOptions, Request, Response } from './cloud_service';
import { CloudServiceResponse } from './cloud_response';

// GCP documentation shows both 'metadata.google.internal' (mostly) and '169.254.169.254' (sometimes)
// To bypass potential DNS changes, the IP was used because it's shared with other cloud services
const SERVICE_ENDPOINT = 'http://169.254.169.254/computeMetadata/v1/instance';

/**
 * Checks and loads the service metadata for an Google Cloud Platform VM if it is available.
 *
 * @internal
 */
export class GCPCloudService extends CloudService {
  constructor(options: CloudServiceOptions = {}) {
    super('gcp', options);
  }

  _checkIfService(request: Request) {
    // we need to call GCP individually for each field we want metadata for
    const fields = ['id', 'machine-type', 'zone'];

    const create = this._createRequestForField;
    const allRequests = fields.map((field) => promisify(request)(create(field)));
    return (
      Promise.all(allRequests)
        // Note: there is no fallback option for GCP;
        // responses are arrays containing [fullResponse, body];
        // because GCP returns plaintext, we have no way of validating
        // without using the response code.
        .then((responses) => {
          return responses.map((response) => {
            if (!response || response.statusCode === 404) {
              throw new Error('GCP request failed');
            }
            return this._extractBody(response, response.body);
          });
        })
        .then(([id, machineType, zone]) => this._combineResponses(id, machineType, zone))
    );
  }

  _createRequestForField(field: string) {
    return {
      method: 'GET',
      uri: `${SERVICE_ENDPOINT}/${field}`,
      headers: {
        // GCP requires this header
        'Metadata-Flavor': 'Google',
      },
      // GCP does _not_ return JSON
      json: false,
    };
  }

  /**
   * Extract the body if the response is valid and it came from GCP.
   */
  _extractBody(response: Response, body?: Response['body']) {
    if (
      response?.statusCode === 200 &&
      response.headers &&
      response.headers['metadata-flavor'] === 'Google'
    ) {
      return body;
    }

    return null;
  }

  /**
   * Parse the GCP responses, if possible.
   *
   * Example values for each parameter:
   *
   * vmId: '5702733457649812345'
   * machineType: 'projects/441331612345/machineTypes/f1-micro'
   * zone: 'projects/441331612345/zones/us-east4-c'
   */
  _combineResponses(id: string, machineType: string, zone: string) {
    const vmId = isString(id) ? id.trim() : undefined;
    const vmType = this._extractValue('machineTypes/', machineType);
    const vmZone = this._extractValue('zones/', zone);

    let region;

    if (vmZone) {
      // converts 'us-east4-c' into 'us-east4'
      region = vmZone.substring(0, vmZone.lastIndexOf('-'));
    }

    // ensure we actually have some data
    if (vmId || vmType || region || vmZone) {
      return new CloudServiceResponse(this._name, true, { id: vmId, vmType, region, zone: vmZone });
    }

    throw new Error('unrecognized responses');
  }

  /**
   * Extract the useful information returned from GCP while discarding
   * unwanted account details (the project ID).
   *
   * For example, this turns something like
   * 'projects/441331612345/machineTypes/f1-micro' into 'f1-micro'.
   */
  _extractValue(fieldPrefix: string, value: string) {
    if (isString(value)) {
      const index = value.lastIndexOf(fieldPrefix);

      if (index !== -1) {
        return value.substring(index + fieldPrefix.length).trim();
      }
    }

    return undefined;
  }
}
