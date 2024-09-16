/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    const error = await sendErrorRequest();
    sinon.assert.calledOnce(getSendRequestSpy());
    expect(error).toEqual(getErrorResponse());
  });
});
