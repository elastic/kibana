/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';

import { HttpSetup } from '../../../../../src/core/public';
import { sendRequest, SendRequestConfig } from './send_request';

export interface UseRequestConfig extends SendRequestConfig {
  pollIntervalMs?: number;
  initialData?: any;
  deserializer?: (data: any) => any;
}

export interface UseRequestResponse<D = any, E = Error> {
  isInitialRequest: boolean;
  isLoading: boolean;
  error: E | null;
  data?: D | null;
  resendRequest: () => void;
}

export const useRequest = <D = any, E = Error>(
  httpClient: HttpSetup,
  { path, method, query, body, pollIntervalMs, initialData, deserializer }: UseRequestConfig
): UseRequestResponse<D, E> => {
  const isMounted = useRef(false);

  // Main states for tracking request status and data
  const [error, setError] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(initialData);

  // Consumers can use isInitialRequest to implement a polling UX.
  const requestCountRef = useRef<number>(0);
  const isInitialRequestRef = useRef<boolean>(true);
  const pollIntervalIdRef = useRef<any>(null);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }
  }, []);

  // Convert our object to string to be able to compare them in our useMemo,
  // allowing the consumer to freely passed new objects to the hook on each
  // render without requiring them to be memoized.
  const queryStringified = query ? JSON.stringify(query) : undefined;
  const bodyStringified = body ? JSON.stringify(body) : undefined;

  const requestBody = useMemo(() => {
    return {
      path,
      method,
      query: queryStringified ? query : undefined,
      body: bodyStringified ? body : undefined,
    };
    // queryStringified and bodyStringified stand in for query and body as dependencies.
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [path, method, queryStringified, bodyStringified]);

  const resendRequest = useCallback(async () => {
    // If we're on an interval, this allows us to reset it if the user has manually requested the
    // data, to avoid doubled-up requests.
    clearPollInterval();

    const requestId = ++requestCountRef.current;

    // We don't clear error or data, so it's up to the consumer to decide whether to display the
    // "old" error/data or loading state when a new request is in-flight.
    setIsLoading(true);

    const response = await sendRequest<D, E>(httpClient, requestBody);
    const { data: serializedResponseData, error: responseError } = response;

    const isOutdatedRequest = requestId !== requestCountRef.current;
    const isUnmounted = isMounted.current === false;

    // Ignore outdated or irrelevant data.
    if (isOutdatedRequest || isUnmounted) {
      return;
    }

    // Surface to consumers that at least one request has resolved.
    isInitialRequestRef.current = false;

    setError(responseError);
    // If there's an error, keep the data from the last request in case it's still useful to the user.
    if (!responseError) {
      const responseData = deserializer
        ? deserializer(serializedResponseData)
        : serializedResponseData;
      setData(responseData);
    }
    // Setting isLoading to false also acts as a signal for scheduling the next poll request.
    setIsLoading(false);
  }, [requestBody, httpClient, deserializer, clearPollInterval]);

  const scheduleRequest = useCallback(() => {
    // If there's a scheduled poll request, this new one will supersede it.
    clearPollInterval();

    if (pollIntervalMs) {
      pollIntervalIdRef.current = setTimeout(resendRequest, pollIntervalMs);
    }
  }, [pollIntervalMs, resendRequest, clearPollInterval]);

  // Send the request on component mount and whenever the dependencies of resendRequest() change.
  useEffect(() => {
    resendRequest();
  }, [resendRequest]);

  // Schedule the next poll request when the previous one completes.
  useEffect(() => {
    // When a request completes, attempt to schedule the next one. Note that we aren't re-scheduling
    // a request whenever resendRequest's dependencies change. isLoading isn't set to false until the
    // initial request has completed, so we won't schedule a request on mount.
    if (!isLoading) {
      scheduleRequest();
    }
  }, [isLoading, scheduleRequest]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Clean up on unmount.
      clearPollInterval();
    };
  }, [clearPollInterval]);

  return {
    isInitialRequest: isInitialRequestRef.current,
    isLoading,
    error,
    data,
    resendRequest, // Gives the user the ability to manually request data
  };
};
