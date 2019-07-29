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

import { useEffect, useState, useRef } from 'react';

export interface SendRequestConfig {
  path: string;
  method: string;
  body?: any;
}

export interface SendRequestResponse {
  data: any;
  error: Error;
}

export interface UseRequestConfig extends SendRequestConfig {
  pollIntervalMs?: number;
  initialData?: any;
  deserializer?: (data: any) => any;
}

export const sendRequest = async (
  httpClient: ng.IHttpService,
  { path, method, body }: SendRequestConfig
): Promise<Partial<SendRequestResponse>> => {
  try {
    const response = await (httpClient as any)[method](path, body);

    if (typeof response.data === 'undefined') {
      throw new Error(response.statusText);
    }

    return { data: response.data };
  } catch (e) {
    return {
      error: e.response ? e.response : e,
    };
  }
};

export const useRequest = (
  httpClient: ng.IHttpService,
  {
    path,
    method,
    body,
    pollIntervalMs,
    initialData,
    deserializer = (data: any): any => data,
  }: UseRequestConfig
) => {
  // Main states for tracking request status and data
  const [error, setError] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(initialData);

  // Consumers can use isInitialRequest to implement a polling UX.
  const [isInitialRequest, setIsInitialRequest] = useState<boolean>(true);
  const pollInterval = useRef<any>(null);
  const pollIntervalId = useRef<any>(null);

  // We always want to use the most recently-set interval in scheduleRequest.
  pollInterval.current = pollIntervalMs;

  // Tied to every render and bound to each request.
  let isOutdatedRequest = false;

  const scheduleRequest = () => {
    // Clear current interval
    if (pollIntervalId.current) {
      clearTimeout(pollIntervalId.current);
    }

    // Set new interval
    if (pollInterval.current) {
      pollIntervalId.current = setTimeout(_sendRequest, pollInterval.current);
    }
  };

  const _sendRequest = async () => {
    // We don't clear error or data, so it's up to the consumer to decide whether to display the
    // "old" error/data or loading state when a new request is in-flight.
    setIsLoading(true);

    const requestBody = {
      path,
      method,
      body,
    };

    const response = await sendRequest(httpClient, requestBody);
    const { data: serializedResponseData, error: responseError } = response;
    const responseData = deserializer(serializedResponseData);

    // If an outdated request has resolved, DON'T update state, but DO allow the processData handler
    // to execute side effects like update telemetry.
    if (isOutdatedRequest) {
      return;
    }

    setError(responseError);
    setData(responseData);
    setIsLoading(false);
    setIsInitialRequest(false);

    // If we're on an interval, we need to schedule the next request. This also allows us to reset
    // the interval if the user has manually requested the data, to avoid doubled-up requests.
    scheduleRequest();
  };

  useEffect(() => {
    _sendRequest();
    // To be functionally correct we'd send a new request if the method, path, or body changes.
    // But it doesn't seem likely that the method will change and body is likely to be a new
    // object even if its shape hasn't changed, so for now we're just watching the path.
  }, [path]);

  useEffect(() => {
    scheduleRequest();

    // Clean up intervals and inflight requests and corresponding state changes
    return () => {
      isOutdatedRequest = true;
      if (pollIntervalId.current) {
        clearTimeout(pollIntervalId.current);
      }
    };
  }, [pollIntervalMs]);

  return {
    isInitialRequest,
    isLoading,
    error,
    data,
    sendRequest: _sendRequest, // Gives the user the ability to manually request data
  };
};
