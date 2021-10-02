/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import sinon from 'sinon';

import { SendRequestHelpers, createSendRequestHelpers } from './send_request.test.helpers';

describe('sendRequest function', () => {
  let helpers: SendRequestHelpers;

  beforeEach(() => {
    helpers = createSendRequestHelpers();
  });

  it('uses the provided path, method, and body to send the request', async () => {
    const { sendSuccessRequest, getSendRequestSpy, getSuccessResponse } = helpers;

    const response = await sendSuccessRequest();
    sinon.assert.calledOnce(getSendRequestSpy());
    expect(response).toEqual(getSuccessResponse());
  });

  it('surfaces errors', async () => {
    const { sendErrorRequest, getSendRequestSpy, getErrorResponse } = helpers;

    // For some reason sinon isn't throwing an error on rejection, as an awaited Promise normally would.
    const errorResponse = await sendErrorRequest();
    sinon.assert.calledOnce(getSendRequestSpy());
    expect(errorResponse).toEqual(getErrorResponse());
  });

  it('calls responseInterceptors with successful responses', async () => {
    const { sendSuccessRequest, getSuccessResponse } = helpers;
    const successInterceptorSpy = sinon.spy();
    const successInterceptors = [successInterceptorSpy];

    await sendSuccessRequest(successInterceptors);
    sinon.assert.calledOnce(successInterceptorSpy);
    sinon.assert.calledWith(successInterceptorSpy, getSuccessResponse());
  });

  it('calls responseInterceptors with errors', async () => {
    const { sendErrorRequest, getErrorResponse } = helpers;
    const errorInterceptorSpy = sinon.spy();
    const errorInterceptors = [errorInterceptorSpy];

    // For some reason sinon isn't throwing an error on rejection, as an awaited Promise normally would.
    await sendErrorRequest(errorInterceptors);
    sinon.assert.calledOnce(errorInterceptorSpy);
    sinon.assert.calledWith(errorInterceptorSpy, getErrorResponse());
  });
});
