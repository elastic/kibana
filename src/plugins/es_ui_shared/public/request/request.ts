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

import { useEffect, useState, useRef, useMemo } from 'react';

import { HttpSetup, HttpFetchQuery } from '../../../../../src/core/public';

export interface SendRequestConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
  query?: HttpFetchQuery;
  body?: any;
}

export interface SendRequestResponse<D = any, E = Error> {
  data: D | null;
  error: E | null;
}

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
  sendRequest: (...args: any[]) => Promise<SendRequestResponse<D, E>>;
}

export const sendRequest = async <D = any, E = Error>(
  httpClient: HttpSetup,
  { path, method, body, query }: SendRequestConfig
): Promise<SendRequestResponse<D, E>> => {
  try {
    const stringifiedBody = typeof body === 'string' ? body : JSON.stringify(body);
    const response = await httpClient[method](path, { body: stringifiedBody, query });

    return {
      data: response.data ? response.data : response,
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e.response && e.response.data ? e.response.data : e.body,
    };
  }
};

export const useRequest = <D = any, E = Error>(
  httpClient: HttpSetup,
  {
    path,
    method,
    query,
    body,
    pollIntervalMs,
    initialData,
    deserializer = (data: any): any => data,
  }: UseRequestConfig
): UseRequestResponse<D, E> => {
  const sendRequestRef = useRef<() => Promise<SendRequestResponse<D, E>>>();
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

  // Tied to every render and bound to each request.
  let isOutdatedRequest = false;

  scheduleRequestRef.current = () => {
    // Clear current interval
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
    }

    // Set new interval
    if (pollIntervalMsRef.current) {
      pollIntervalIdRef.current = setTimeout(sendRequestRef.current!, pollIntervalMsRef.current);
    }
  };

  sendRequestRef.current = async () => {
    // We don't clear error or data, so it's up to the consumer to decide whether to display the
    // "old" error/data or loading state when a new request is in-flight.
    setIsLoading(true);

    const requestBody = {
      path,
      method,
      query,
      body,
    };

    const response = await sendRequest<D, E>(httpClient, requestBody);
    const { data: serializedResponseData, error: responseError } = response;

    // If an outdated request has resolved, ignore its outdated data.
    if (isOutdatedRequest) {
      return { data: null, error: null };
    }

    setError(responseError);
    // If there's an error, keep the data from the last request in case it's still useful to the user.
    if (!responseError) {
      const responseData = deserializer(serializedResponseData);
      setData(responseData);
    }
    setIsLoading(false);
    setIsInitialRequest(false);

    // If we're on an interval, we need to schedule the next request. This also allows us to reset
    // the interval if the user has manually requested the data, to avoid doubled-up requests.
    scheduleRequestRef.current!();

    return { data: serializedResponseData, error: responseError };
  };

  const stringifiedQuery = useMemo(() => JSON.stringify(query), [query]);

  useEffect(() => {
    sendRequestRef.current!();

    // To be functionally correct we'd send a new request if the method, path, query or body changes.
    // But it doesn't seem likely that the method will change and body is likely to be a new
    // object even if its shape hasn't changed, so for now we're just watching the path and the query.
  }, [path, stringifiedQuery]);

  useEffect(() => {
    scheduleRequestRef.current!();

    // Clean up timeout and mark inflight requests as stale if the poll interval changes.
    return () => {
      isOutdatedRequest = true;
      if (pollIntervalIdRef.current) {
        clearTimeout(pollIntervalIdRef.current);
      }
    };
  }, [pollIntervalMs]);

  return {
    isInitialRequest,
    isLoading,
    error,
    data,
    sendRequest: sendRequestRef.current, // Gives the user the ability to manually request data
  };
};
