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
