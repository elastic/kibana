/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { isObject, isString, isPlainObject } from 'lodash';
import defaultRequest from 'request';
import type { OptionsWithUri, Response as DefaultResponse } from 'request';
import { CloudServiceResponse } from './cloud_response';

/** @internal */
export type Request = typeof defaultRequest;

/** @internal */
export type RequestOptions = OptionsWithUri;

/** @internal */
export type Response = DefaultResponse;

/** @internal */
export interface CloudServiceOptions {
  _request?: Request;
  _fs?: typeof fs;
  _isWindows?: boolean;
}

/**
 * CloudService provides a mechanism for cloud services to be checked for
 * metadata that may help to determine the best defaults and priorities.
 */
export abstract class CloudService {
  private readonly _request: Request;
  protected readonly _name: string;

  constructor(name: string, options: CloudServiceOptions = {}) {
    this._name = name.toLowerCase();

    // Allow the HTTP handler to be swapped out for tests
    const { _request = defaultRequest } = options;

    this._request = _request;
  }

  /**
   * Get the search-friendly name of the Cloud Service.
   */
  getName() {
    return this._name;
  }

  /**
   * Using whatever mechanism is required by the current Cloud Service,
   * determine if Kibana is running in it and return relevant metadata.
   */
  async checkIfService() {
    try {
      return await this._checkIfService(this._request);
    } catch (e) {
      return this._createUnconfirmedResponse();
    }
  }

  _checkIfService(request: Request): Promise<CloudServiceResponse> {
    // should always be overridden by a subclass
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Create a new CloudServiceResponse that denotes that this cloud service
   * is not being used by the current machine / VM.
   */
  _createUnconfirmedResponse() {
    return CloudServiceResponse.unconfirmed(this._name);
  }

  /**
   * Strictly parse JSON.
   */
  _stringToJson(value: string) {
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
  }

  /**
   * Convert the response to a JSON object and attempt to parse it using the
   * parseBody function.
   *
   * If the response cannot be parsed as a JSON object, or if it fails to be
   * useful, then parseBody should return null.
   */
  _parseResponse(
    body: Response['body'],
    parseBody?: (body: Response['body']) => CloudServiceResponse | null
  ): Promise<CloudServiceResponse> {
    // parse it if necessary
    if (isString(body)) {
      try {
        body = this._stringToJson(body);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    if (isObject(body) && parseBody) {
      const response = parseBody(body);

      if (response) {
        return Promise.resolve(response);
      }
    }

    // use default handling
    return Promise.reject();
  }
}
