/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';

import { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
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
    .withArgs(
      successRequest.path,
      sinon.match({
        body: JSON.stringify(successRequest.body),
        query: undefined,
      })
    )
    .resolves(successResponse);
  const sendSuccessRequest = () => sendRequest({ ...successRequest });
  const getSuccessResponse = () => ({ data: successResponse.data, error: null });

  // Set up failed request helpers.
  sendRequestSpy
    .withArgs(
      errorRequest.path,
      sinon.match({
        body: JSON.stringify(errorRequest.body),
        query: undefined,
      })
    )
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
