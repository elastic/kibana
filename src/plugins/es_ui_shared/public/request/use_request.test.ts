/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import sinon from 'sinon';

import {
  UseRequestHelpers,
  REQUEST_TIME,
  createUseRequestHelpers,
} from './use_request.test.helpers';

describe('useRequest hook', () => {
  let helpers: UseRequestHelpers;

  beforeEach(() => {
    helpers = createUseRequestHelpers();
  });

  describe('parameters', () => {
    describe('path, method, body', () => {
      it('is used to send the request', async () => {
        const { setupSuccessRequest, completeRequest, hookResult, getSuccessResponse } = helpers;
        setupSuccessRequest();
        await completeRequest();
        expect(hookResult.data).toBe(getSuccessResponse().data);
      });
    });

    describe('pollIntervalMs', () => {
      it('sends another request after the specified time has elapsed', async () => {
        const { setupSuccessRequest, advanceTime, getSendRequestSpy } = helpers;
        setupSuccessRequest({ pollIntervalMs: REQUEST_TIME });

        await advanceTime(REQUEST_TIME);
        expect(getSendRequestSpy().callCount).toBe(1);

        // We need to advance (1) the pollIntervalMs and (2) the request time.
        await advanceTime(REQUEST_TIME * 2);
        expect(getSendRequestSpy().callCount).toBe(2);

        // We need to advance (1) the pollIntervalMs and (2) the request time.
        await advanceTime(REQUEST_TIME * 2);
        expect(getSendRequestSpy().callCount).toBe(3);
      });
    });

    describe('initialData', () => {
      it('sets the initial data value', async () => {
        const { setupSuccessRequest, completeRequest, hookResult, getSuccessResponse } = helpers;
        setupSuccessRequest({ initialData: 'initialData' });
        expect(hookResult.data).toBe('initialData');

        // The initial data value will be overwritten once the request resolves.
        await completeRequest();
        expect(hookResult.data).toBe(getSuccessResponse().data);
      });
    });

    describe('deserializer', () => {
      it('is called with the response once the request resolves', async () => {
        const { setupSuccessRequest, completeRequest, getSuccessResponse } = helpers;

        const deserializer = sinon.stub();
        setupSuccessRequest({ deserializer });
        sinon.assert.notCalled(deserializer);
        await completeRequest();

        sinon.assert.calledOnce(deserializer);
        sinon.assert.calledWith(deserializer, getSuccessResponse().data);
      });

      it('provides the data return value', async () => {
        const { setupSuccessRequest, completeRequest, hookResult } = helpers;
        setupSuccessRequest({ deserializer: () => 'intercepted' });
        await completeRequest();
        expect(hookResult.data).toBe('intercepted');
      });
    });
  });

  describe('state', () => {
    describe('isInitialRequest', () => {
      it('is true for the first request and false for subsequent requests', async () => {
        const { setupSuccessRequest, completeRequest, hookResult } = helpers;
        setupSuccessRequest();
        expect(hookResult.isInitialRequest).toBe(true);
        act(() => {
          hookResult.resendRequest();
        });
        await completeRequest();
        expect(hookResult.isInitialRequest).toBe(false);
      });
    });

    describe('isLoading', () => {
      it('represents in-flight request status', async () => {
        const { setupSuccessRequest, completeRequest, hookResult } = helpers;
        setupSuccessRequest();
        expect(hookResult.isLoading).toBe(true);

        await completeRequest();
        expect(hookResult.isLoading).toBe(false);
      });
    });

    describe('error', () => {
      it('surfaces errors from requests', async () => {
        const { setupErrorRequest, completeRequest, hookResult, getErrorResponse } = helpers;
        setupErrorRequest();
        await completeRequest();
        expect(hookResult.error).toBe(getErrorResponse().error);
      });

      it('surfaces body-shaped errors from requests', async () => {
        const {
          setupErrorWithBodyRequest,
          completeRequest,
          hookResult,
          getErrorWithBodyResponse,
        } = helpers;

        setupErrorWithBodyRequest();
        await completeRequest();
        expect(hookResult.error).toBe(getErrorWithBodyResponse().error);
      });

      it('persists while a request is in-flight', async () => {
        const { setupErrorRequest, completeRequest, hookResult, getErrorResponse } = helpers;
        setupErrorRequest();
        await completeRequest();
        expect(hookResult.isLoading).toBe(false);
        expect(hookResult.error).toBe(getErrorResponse().error);

        act(() => {
          hookResult.resendRequest();
        });
        expect(hookResult.isLoading).toBe(true);
        expect(hookResult.error).toBe(getErrorResponse().error);
      });

      it('is null when the request is successful', async () => {
        const { setupSuccessRequest, completeRequest, hookResult } = helpers;
        setupSuccessRequest();
        expect(hookResult.error).toBeNull();

        await completeRequest();
        expect(hookResult.isLoading).toBe(false);
        expect(hookResult.error).toBeNull();
      });
    });

    describe('data', () => {
      it('surfaces payloads from requests', async () => {
        const { setupSuccessRequest, completeRequest, hookResult, getSuccessResponse } = helpers;
        setupSuccessRequest();
        expect(hookResult.data).toBeUndefined();

        await completeRequest();
        expect(hookResult.data).toBe(getSuccessResponse().data);
      });

      it('persists while a request is in-flight', async () => {
        const { setupSuccessRequest, completeRequest, hookResult, getSuccessResponse } = helpers;
        setupSuccessRequest();
        await completeRequest();
        expect(hookResult.isLoading).toBe(false);
        expect(hookResult.data).toBe(getSuccessResponse().data);

        act(() => {
          hookResult.resendRequest();
        });
        expect(hookResult.isLoading).toBe(true);
        expect(hookResult.data).toBe(getSuccessResponse().data);
      });

      it('persists from last successful request when the next request fails', async () => {
        const {
          setupSuccessRequest,
          completeRequest,
          hookResult,
          getErrorResponse,
          setErrorResponse,
          getSuccessResponse,
        } = helpers;

        setupSuccessRequest();
        await completeRequest();
        expect(hookResult.isLoading).toBe(false);
        expect(hookResult.error).toBeNull();
        expect(hookResult.data).toBe(getSuccessResponse().data);

        setErrorResponse();
        await completeRequest();
        expect(hookResult.isLoading).toBe(false);
        expect(hookResult.error).toBe(getErrorResponse().error);
        expect(hookResult.data).toBe(getSuccessResponse().data);
      });
    });
  });

  describe('callbacks', () => {
    describe('resendRequest', () => {
      it('sends the request', async () => {
        const { setupSuccessRequest, completeRequest, hookResult, getSendRequestSpy } = helpers;
        setupSuccessRequest();

        await completeRequest();
        expect(getSendRequestSpy().callCount).toBe(1);

        await act(async () => {
          hookResult.resendRequest();
          await completeRequest();
        });
        expect(getSendRequestSpy().callCount).toBe(2);
      });

      it('resets the pollIntervalMs', async () => {
        const { setupSuccessRequest, advanceTime, hookResult, getSendRequestSpy } = helpers;
        const DOUBLE_REQUEST_TIME = REQUEST_TIME * 2;
        setupSuccessRequest({ pollIntervalMs: DOUBLE_REQUEST_TIME });

        // The initial request resolves, and then we'll immediately send a new one manually...
        await advanceTime(REQUEST_TIME);
        expect(getSendRequestSpy().callCount).toBe(1);
        act(() => {
          hookResult.resendRequest();
        });

        // The manual request resolves, and we'll send yet another one...
        await advanceTime(REQUEST_TIME);
        expect(getSendRequestSpy().callCount).toBe(2);
        act(() => {
          hookResult.resendRequest();
        });

        // At this point, we've moved forward 3s. The poll is set at 2s. If resendRequest didn't
        // reset the poll, the request call count would be 4, not 3.
        await advanceTime(REQUEST_TIME);
        expect(getSendRequestSpy().callCount).toBe(3);
      });
    });
  });

  describe('request behavior', () => {
    it('outdated responses are ignored by poll requests', async () => {
      const {
        setupSuccessRequest,
        setErrorResponse,
        completeRequest,
        hookResult,
        getErrorResponse,
        getSendRequestSpy,
      } = helpers;
      const DOUBLE_REQUEST_TIME = REQUEST_TIME * 2;
      // Send initial request, which will have a longer round-trip time.
      setupSuccessRequest({}, [DOUBLE_REQUEST_TIME]);

      // Send a new request, which will have a shorter round-trip time.
      setErrorResponse();

      // Complete both requests.
      await completeRequest();

      // Two requests were sent...
      expect(getSendRequestSpy().callCount).toBe(2);
      // ...but the error response is the one that takes precedence because it was *sent* more
      // recently, despite the success response *returning* more recently.
      expect(hookResult.error).toBe(getErrorResponse().error);
      expect(hookResult.data).toBeUndefined();
    });

    it(`outdated responses are ignored if there's a more recently-sent manual request`, async () => {
      const { setupSuccessRequest, advanceTime, hookResult, getSendRequestSpy } = helpers;

      const HALF_REQUEST_TIME = REQUEST_TIME * 0.5;
      setupSuccessRequest({ pollIntervalMs: REQUEST_TIME });

      // Before the original request resolves, we make a manual resendRequest call.
      await advanceTime(HALF_REQUEST_TIME);
      expect(getSendRequestSpy().callCount).toBe(0);
      act(() => {
        hookResult.resendRequest();
      });

      // The original quest resolves but it's been marked as outdated by the the manual resendRequest
      // call "interrupts", so data is left undefined.
      await advanceTime(HALF_REQUEST_TIME);
      expect(getSendRequestSpy().callCount).toBe(1);
      expect(hookResult.data).toBeUndefined();
    });

    it(`changing pollIntervalMs doesn't trigger a new request`, async () => {
      const { setupErrorRequest, setErrorResponse, completeRequest, getSendRequestSpy } = helpers;
      const DOUBLE_REQUEST_TIME = REQUEST_TIME * 2;
      // Send initial request.
      setupErrorRequest({ pollIntervalMs: REQUEST_TIME });

      // Setting a new poll will schedule a second request, but not send one immediately.
      setErrorResponse({ pollIntervalMs: DOUBLE_REQUEST_TIME });

      // Complete initial request.
      await completeRequest();

      // Complete scheduled poll request.
      await completeRequest();
      expect(getSendRequestSpy().callCount).toBe(2);
    });

    it('when the path changes after a request is scheduled, the scheduled request is sent with that path', async () => {
      const {
        setupSuccessRequest,
        completeRequest,
        hookResult,
        getErrorResponse,
        setErrorResponse,
        getSendRequestSpy,
      } = helpers;
      const DOUBLE_REQUEST_TIME = REQUEST_TIME * 2;

      // Sned first request and schedule a request, both with the success path.
      setupSuccessRequest({ pollIntervalMs: DOUBLE_REQUEST_TIME });

      // Change the path to the error path, sending a second request. pollIntervalMs is the same
      // so the originally scheduled poll remains cheduled.
      setErrorResponse({ pollIntervalMs: DOUBLE_REQUEST_TIME });

      // Complete the initial request, the requests by the path change, and the scheduled poll request.
      await completeRequest();
      await completeRequest();

      // If the scheduled poll request was sent to the success path, we wouldn't have an error result.
      // But we do, because it was sent to the error path.
      expect(getSendRequestSpy().callCount).toBe(3);
      expect(hookResult.error).toBe(getErrorResponse().error);
    });
  });
});
