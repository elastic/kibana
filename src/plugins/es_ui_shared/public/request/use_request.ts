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

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';

import { HttpSetup } from '../../../../../src/core/public';
import {
  sendRequest as sendStatelessRequest,
  SendRequestConfig,
  SendRequestResponse,
} from './send_request';

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
  sendRequest: () => Promise<SendRequestResponse<D, E>>;
}

export const useRequest = <D = any, E = Error>(
  httpClient: HttpSetup,
  { path, method, query, body, pollIntervalMs, initialData, deserializer }: UseRequestConfig
): UseRequestResponse<D, E> => {
  const scheduleRequestRef = useRef<() => void>();

  // Main states for tracking request status and data
  const [error, setError] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(initialData);

  // Consumers can use isInitialRequest to implement a polling UX.
  const [isInitialRequest, setIsInitialRequest] = useState<boolean>(true);
  const pollIntervalMsRef = useRef<number | undefined>();
  const pollIntervalIdRef = useRef<any>(null);

  // We always want to use the most recently-set interval when scheduling the next request.
  pollIntervalMsRef.current = pollIntervalMs;

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
    }
  }, []);

  // Tied to every render and bound to each request.
  let isOutdatedRequest = false;

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

  const sendRequest = useCallback(async () => {
    // If we're on an interval, this allows us to reset it if the user has manually requested the
    // data, to avoid doubled-up requests.
    clearPollInterval();

    // We don't clear error or data, so it's up to the consumer to decide whether to display the
    // "old" error/data or loading state when a new request is in-flight.
    setIsLoading(true);

    const response = await sendStatelessRequest<D, E>(httpClient, requestBody);
    const { data: serializedResponseData, error: responseError } = response;

    // If an outdated request has resolved, ignore its outdated data.
    if (isOutdatedRequest) {
      return { data: null, error: null };
    }

    setError(responseError);
    // If there's an error, keep the data from the last request in case it's still useful to the user.
    if (!responseError) {
      const responseData = deserializer
        ? deserializer(serializedResponseData)
        : serializedResponseData;
      setData(responseData);
    }
    setIsLoading(false);
    setIsInitialRequest(false);

    // If we're on an interval, we need to schedule the next request.
    scheduleRequestRef.current!();

    return { data: serializedResponseData, error: responseError };
  }, [requestBody, httpClient, deserializer, clearPollInterval, isOutdatedRequest]);

  useEffect(() => {
    sendRequest();
  }, [sendRequest]);

  scheduleRequestRef.current = () => {
    // If there's a scheduled poll request, this new one should supersede it.
    clearPollInterval();

    // Schedule next poll request.
    if (pollIntervalMsRef.current) {
      pollIntervalIdRef.current = setTimeout(sendRequest, pollIntervalMsRef.current);
    }
  };

  useEffect(() => {
    scheduleRequestRef.current!();

    // Clean up timeout and mark in-flight requests as stale if the poll interval changes.
    return () => {
      /* eslint-disable-next-line react-hooks/exhaustive-deps */
      isOutdatedRequest = true;
      clearPollInterval();
    };
  }, [pollIntervalMs]);

  return {
    isInitialRequest,
    isLoading,
    error,
    data,
    sendRequest, // Gives the user the ability to manually request data
  };
};
