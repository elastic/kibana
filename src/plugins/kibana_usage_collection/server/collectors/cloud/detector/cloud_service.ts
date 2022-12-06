/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbortSignal } from 'abort-controller';
import { isObject, isPlainObject } from 'lodash';
import { CloudServiceResponse } from './cloud_response';

/**
 * CloudService provides a mechanism for cloud services to be checked for
 * metadata that may help to determine the best defaults and priorities.
 */
export abstract class CloudService {
  protected readonly _name: string;

  constructor(name: string) {
    this._name = name.toLowerCase();
  }

  /**
   * Get the search-friendly name of the Cloud Service.
   */
  public getName = () => {
    return this._name;
  };

  /**
   * Using whatever mechanism is required by the current Cloud Service,
   * determine if Kibana is running in it and return relevant metadata.
   */
  public checkIfService = async (signal?: AbortSignal) => {
    try {
      return await this._checkIfService(signal);
    } catch (e) {
      return this._createUnconfirmedResponse();
    }
  };

  protected _checkIfService = async (signal?: AbortSignal): Promise<CloudServiceResponse> => {
    // should always be overridden by a subclass
    return Promise.reject(new Error('not implemented'));
  };

  /**
   * Create a new CloudServiceResponse that denotes that this cloud service
   * is not being used by the current machine / VM.
   */
  protected _createUnconfirmedResponse = () => {
    return CloudServiceResponse.unconfirmed(this._name);
  };

  /**
   * Strictly parse JSON.
   */
  protected _stringToJson = (value: string) => {
    // note: this will throw an error if this is not a string
    value = value.trim();

    try {
      const json = JSON.parse(value);
      // we don't want to return scalar values, arrays, etc.
      if (!isPlainObject(json)) {
        throw new Error('not a plain object');
      }
      return json;
    } catch (e) {
      throw new Error(`'${value}' is not a JSON object`);
    }
  };

  /**
   * Convert the response to a JSON object and attempt to parse it using the
   * parseBody function.
   *
   * If the response cannot be parsed as a JSON object, or if it fails to be
   * useful, then parseBody should return null.
   */
  protected _parseResponse = <Body>(
    body: string | Body,
    parseBodyFn: (body: Body) => CloudServiceResponse | null
  ): CloudServiceResponse => {
    // parse it if necessary
    const jsonBody: Body = typeof body === 'string' ? this._stringToJson(body) : body;

    if (isObject(jsonBody) && typeof parseBodyFn !== 'undefined') {
      const response = parseBodyFn(jsonBody);
      if (response) {
        return response;
      }
    }

    // use default handling
    throw new Error('Unable to handle body');
  };
}
