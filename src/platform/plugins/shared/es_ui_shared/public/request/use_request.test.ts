/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, waitFor } from '@testing-library/react';
import sinon from 'sinon';

import type { UseRequestHelpers } from './use_request.test.helpers';
import { REQUEST_TIME, createUseRequestHelpers } from './use_request.test.helpers';

describe('useRequest hook', () => {
  let helpers: UseRequestHelpers;

  beforeEach(() => {
    helpers = createUseRequestHelpers();
  });

  describe('parameters', () => {
    describe('path, method, body', () => {
      afterEach(async () => {
        await helpers.teardownFake();
      });

      it('is used to send the request', async () => {
        const { setupSuccessRequest, completeRequest, hookResult, getSuccessResponse } = helpers;
        setupSuccessRequest();
        await completeRequest();
        expect(hookResult.data).toBe(getSuccessResponse().data);
      });
    });

    describe('pollIntervalMs', () => {
      afterEach(async () => {
        await helpers.teardown();
      });

      it('sends another request after the specified time has elapsed', async () => {
        jest.useRealTimers(); // Use real timers to avoid fake timer + act() state batching issues
        const { setupSuccessRequest, getSendRequestSpy } = helpers;

        setupSuccessRequest({ pollIntervalMs: REQUEST_TIME });

        // Wait for first request to complete
        await waitFor(() => expect(getSendRequestSpy().callCount).toBe(1));

        // Wait for second request (poll fires + request completes)
        await waitFor(() => expect(getSendRequestSpy().callCount).toBe(2));

        // Wait for third request (poll fires + request completes)
        await waitFor(() => expect(getSendRequestSpy().callCount).toBe(3));
      });
    });

    describe('initialData', () => {
      afterEach(async () => {
        await helpers.teardownFake();
      });

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
      afterEach(async () => {
        await helpers.teardownFake();
      });

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
    afterEach(async () => {
      await helpers.teardownFake();
    });

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
        const { setupErrorWithBodyRequest, completeRequest, hookResult, getErrorWithBodyResponse } =
          helpers;

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
      afterEach(async () => {
        await helpers.teardownFake();
      });

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
        const { setupSuccessRequest, hookResult, getSendRequestSpy } = helpers;
        const DOUBLE_REQUEST_TIME = REQUEST_TIME * 2;
        setupSuccessRequest({ pollIntervalMs: DOUBLE_REQUEST_TIME });

        await act(async () => {
          // Advance time enough for the initial request to complete
          await jest.advanceTimersByTimeAsync(DOUBLE_REQUEST_TIME + REQUEST_TIME);
        });

        // Wait for initial request to complete, then send a manual one
        expect(getSendRequestSpy().callCount).toBe(1);
        act(() => {
          hookResult.resendRequest();
        });

        await act(async () => {
          // Advance time enough for the manual request to complete
          await jest.advanceTimersByTimeAsync(DOUBLE_REQUEST_TIME + REQUEST_TIME);
        });

        // Wait for manual request to complete, then send another manual one
        expect(getSendRequestSpy().callCount).toBe(2);
        act(() => {
          hookResult.resendRequest();
        });

        await act(async () => {
          // Advance time enough for the second manual request to complete
          await jest.advanceTimersByTimeAsync(DOUBLE_REQUEST_TIME + REQUEST_TIME);
        });

        // Wait for the second manual request to complete
        // If resendRequest didn't reset the poll, we would see 4 requests instead of 3
        expect(getSendRequestSpy().callCount).toBe(3);
      });
    });
  });

  describe('request behavior', () => {
    afterEach(async () => {
      await helpers.teardownFake();
    });
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
      const { setupSuccessRequest, hookResult, getSendRequestSpy } = helpers;

      setupSuccessRequest({ pollIntervalMs: REQUEST_TIME });

      // Wait half the request time - the initial request hasn't completed yet
      await act(async () => {
        await jest.advanceTimersByTimeAsync(REQUEST_TIME * 0.5);
      });
      expect(getSendRequestSpy().callCount).toBe(0);

      // Make a manual resendRequest call before the original resolves
      act(() => {
        hookResult.resendRequest();
      });

      // Wait for the original request to complete - give it enough time + buffer
      // Original started at T=0, will complete at T=REQUEST_TIME
      // We're now at T=REQUEST_TIME*0.5, so wait REQUEST_TIME*0.6 more
      await act(async () => {
        await jest.advanceTimersByTimeAsync(REQUEST_TIME * 0.5);
      });

      // The spy should have been called once (original request completed)
      expect(getSendRequestSpy().callCount).toBe(1);
      // But the result was ignored, so data should still be undefined
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

    it(`changing pollIntervalMs to undefined cancels the poll`, async () => {
      const { setupErrorRequest, setErrorResponse, completeRequest, getSendRequestSpy } = helpers;
      // Send initial request.
      setupErrorRequest({ pollIntervalMs: REQUEST_TIME });

      // Setting the poll to undefined will cancel subsequent requests.
      setErrorResponse({ pollIntervalMs: undefined });

      // Complete initial request.
      await completeRequest();

      // If there were another scheduled poll request, this would complete it.
      await completeRequest();

      // But because we canceled the poll, we only see 1 request instead of 2.
      expect(getSendRequestSpy().callCount).toBe(1);
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
