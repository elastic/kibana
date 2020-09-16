/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';

import { HttpSetup, HttpFetchOptions } from '../../../../../src/core/public';
import {
  SendRequestConfig,
  SendRequestResponse,
  sendRequest as originalSendRequest,
} from './send_request';

export interface SendRequestHelpers {
  getSendRequestSpy: () => sinon.SinonStub;
  sendSuccessRequest: () => Promise<SendRequestResponse>;
  getSuccessResponse: () => SendRequestResponse;
  sendErrorRequest: () => Promise<SendRequestResponse>;
  getErrorResponse: () => SendRequestResponse;
}

const successRequest: SendRequestConfig = { method: 'post', path: '/success', body: {} };
const successResponse = { statusCode: 200, data: { message: 'Success message' } };

const errorValue = { statusCode: 400, statusText: 'Error message' };
const errorRequest: SendRequestConfig = { method: 'post', path: '/error', body: {} };
const errorResponse = { response: { data: errorValue } };

export const createSendRequestHelpers = (): SendRequestHelpers => {
  const sendRequestSpy = sinon.stub();
  const httpClient = {
    post: (path: string, options: HttpFetchOptions) => sendRequestSpy(path, options),
  };
  const sendRequest = originalSendRequest.bind(null, httpClient as HttpSetup) as <D = any, E = any>(
    config: SendRequestConfig
  ) => Promise<SendRequestResponse<D, E>>;

  // Set up successful request helpers.
  sendRequestSpy
    .withArgs(successRequest.path, {
      body: JSON.stringify(successRequest.body),
      query: undefined,
    })
    .resolves(successResponse);
  const sendSuccessRequest = () => sendRequest({ ...successRequest });
  const getSuccessResponse = () => ({ data: successResponse.data, error: null });

  // Set up failed request helpers.
  sendRequestSpy
    .withArgs(errorRequest.path, {
      body: JSON.stringify(errorRequest.body),
      query: undefined,
    })
    .rejects(errorResponse);
  const sendErrorRequest = () => sendRequest({ ...errorRequest });
  const getErrorResponse = () => ({
    data: null,
    error: errorResponse.response.data,
  });

  return {
    getSendRequestSpy: () => sendRequestSpy,
    sendSuccessRequest,
    getSuccessResponse,
    sendErrorRequest,
    getErrorResponse,
  };
};
