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
import { sendRequest as sendRequestUnbound, useRequest as useRequestUnbound } from './request';

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';

const TestHook = ({ callback }) => {
  callback();
  return null;
};

let element;

const testHook = callback => {
  element = mount(<TestHook callback={callback} />);
};

const wait = async wait => new Promise(resolve => setTimeout(resolve, wait || 1));

// FLAKY:
// - https://github.com/elastic/kibana/issues/42561
// - https://github.com/elastic/kibana/issues/42562
// - https://github.com/elastic/kibana/issues/42563
// - https://github.com/elastic/kibana/issues/42225
describe.skip('request lib', () => {
  const successRequest = { path: '/success', method: 'post', body: {} };
  const errorRequest = { path: '/error', method: 'post', body: {} };
  const successResponse = { statusCode: 200, data: { message: 'Success message' } };
  const errorResponse = { statusCode: 400, statusText: 'Error message' };

  let sendPost;
  let sendRequest;
  let useRequest;

  beforeEach(() => {
    sendPost = sinon.stub();
    sendPost.withArgs(successRequest.path, successRequest.body).returns(successResponse);
    sendPost.withArgs(errorRequest.path, errorRequest.body).throws(errorResponse);

    const httpClient = {
      post: (...args) => {
        return sendPost(...args);
      },
    };

    sendRequest = sendRequestUnbound.bind(null, httpClient);
    useRequest = useRequestUnbound.bind(null, httpClient);
  });

  describe('sendRequest function', () => {
    it('uses the provided path, method, and body to send the request', async () => {
      const response = await sendRequest({ ...successRequest });
      sinon.assert.calledOnce(sendPost);
      expect(response).toEqual({ data: successResponse.data });
    });

    it('surfaces errors', async () => {
      try {
        await sendRequest({ ...errorRequest });
      } catch (e) {
        sinon.assert.calledOnce(sendPost);
        expect(e).toBe(errorResponse.error);
      }
    });
  });

  describe('useRequest hook', () => {
    let hook;

    function initUseRequest(config) {
      act(() => {
        testHook(() => {
          hook = useRequest(config);
        });
      });
    }

    describe('parameters', () => {
      describe('path, method, body', () => {
        it('is used to send the request', async () => {
          initUseRequest({ ...successRequest });
          await wait(50);
          expect(hook.data).toBe(successResponse.data);
        });
      });

      describe('pollIntervalMs', () => {
        it('sends another request after the specified time has elapsed', async () => {
          initUseRequest({ ...successRequest, pollIntervalMs: 10 });
          await wait(50);
          // We just care that multiple requests have been sent out. We don't check the specific
          // timing because that risks introducing flakiness into the tests, and it's unlikely
          // we could break the implementation by getting the exact timing wrong.
          expect(sendPost.callCount).toBeGreaterThan(1);

          // We have to manually clean up or else the interval will continue to fire requests,
          // interfering with other tests.
          element.unmount();
        });
      });

      describe('initialData', () => {
        it('sets the initial data value', () => {
          initUseRequest({ ...successRequest, initialData: 'initialData' });
          expect(hook.data).toBe('initialData');
        });
      });

      describe('deserializer', () => {
        it('is called once the request resolves', async () => {
          const deserializer = sinon.stub();
          initUseRequest({ ...successRequest, deserializer });
          sinon.assert.notCalled(deserializer);

          await wait(50);
          sinon.assert.calledOnce(deserializer);
          sinon.assert.calledWith(deserializer, successResponse.data);
        });

        it('processes data', async () => {
          initUseRequest({ ...successRequest, deserializer: () => 'intercepted' });
          await wait(50);
          expect(hook.data).toBe('intercepted');
        });
      });
    });

    describe('state', () => {
      describe('isInitialRequest', () => {
        it('is true for the first request and false for subsequent requests', async () => {
          initUseRequest({ ...successRequest });
          expect(hook.isInitialRequest).toBe(true);

          hook.sendRequest();
          await wait(50);
          expect(hook.isInitialRequest).toBe(false);
        });
      });

      describe('isLoading', () => {
        it('represents in-flight request status', async () => {
          initUseRequest({ ...successRequest });
          expect(hook.isLoading).toBe(true);

          await wait(50);
          expect(hook.isLoading).toBe(false);
        });
      });

      describe('error', () => {
        it('surfaces errors from requests', async () => {
          initUseRequest({ ...errorRequest });
          await wait(50);
          expect(hook.error).toBe(errorResponse);
        });

        it('persists while a request is in-flight', async () => {
          initUseRequest({ ...errorRequest });
          await wait(50);
          hook.sendRequest();
          expect(hook.isLoading).toBe(true);
          expect(hook.error).toBe(errorResponse);
        });

        it('is undefined when the request is successful', async () => {
          initUseRequest({ ...successRequest });
          await wait(50);
          expect(hook.isLoading).toBe(false);
          expect(hook.error).toBeUndefined();
        });
      });

      describe('data', () => {
        it('surfaces payloads from requests', async () => {
          initUseRequest({ ...successRequest });
          await wait(50);
          expect(hook.data).toBe(successResponse.data);
        });

        it('persists while a request is in-flight', async () => {
          initUseRequest({ ...successRequest });
          await wait(50);
          hook.sendRequest();
          expect(hook.isLoading).toBe(true);
          expect(hook.data).toBe(successResponse.data);
        });

        it('is undefined when the request fails', async () => {
          initUseRequest({ ...errorRequest });
          await wait(50);
          expect(hook.isLoading).toBe(false);
          expect(hook.data).toBeUndefined();
        });
      });
    });

    describe('callbacks', () => {
      describe('sendRequest', () => {
        it('sends the request', () => {
          initUseRequest({ ...successRequest });
          sinon.assert.calledOnce(sendPost);
          hook.sendRequest();
          sinon.assert.calledTwice(sendPost);
        });

        it('resets the pollIntervalMs', async () => {
          initUseRequest({ ...successRequest, pollIntervalMs: 800 });
          await wait(200); // 200ms
          hook.sendRequest();
          expect(sendPost.callCount).toBe(2);

          await wait(200); // 400ms
          hook.sendRequest();

          await wait(200); // 600ms
          hook.sendRequest();

          await wait(200); // 800ms
          hook.sendRequest();

          await wait(200); // 1000ms
          hook.sendRequest();

          // If sendRequest didn't reset the interval, the interval would have triggered another
          // request by now, and the callCount would be 7.
          expect(sendPost.callCount).toBe(6);

          // We have to manually clean up or else the interval will continue to fire requests,
          // interfering with other tests.
          element.unmount();
        });
      });
    });
  });
});
