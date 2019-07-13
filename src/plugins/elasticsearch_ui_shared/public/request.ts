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

export interface SendRequest {
  path: string;
  method: string;
  body?: any;
  uimActionType?: string;
}

export interface SendRequestResponse {
  data: any;
  error: Error;
}

export interface UseRequest extends SendRequest {
  interval?: number;
  initialData?: any;
  processData?: any;
}

export const sendRequest = async (
  httpClient: any,
  { path, method, body }: SendRequest
): Promise<Partial<SendRequestResponse>> => {
  try {
    // NOTE: This is tightly coupled to Angular's $http service.
    const response = await httpClient[method](path, body);

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
  httpClient: any,
  { path, method, body, interval, initialData, processData }: UseRequest
) => {
  // Main states for tracking request status and data
  const [error, setError] = useState<null | any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(initialData);

  // Consumers can use isInitialRequest to implement a polling UX.
  const [isInitialRequest, setIsInitialRequest] = useState<boolean>(true);
  const requestInterval = useRef<any>(null);
  const requestIntervalId = useRef<any>(null);

  // We always want to use the most recently-set interval in updateInterval.
  requestInterval.current = interval;

  // Tied to every render and bound to each request.
  let isOutdatedRequest = false;

  const updateInterval = () => {
    // Clear current interval
    if (requestIntervalId.current) {
      clearTimeout(requestIntervalId.current);
    }

    // Set new interval
    if (requestInterval.current) {
      requestIntervalId.current = setTimeout(_sendRequest, requestInterval.current);
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
    let { data: responseData } = response;
    const { error: responseError } = response;

    if (processData) {
      responseData = processData(responseData);
    }

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
    updateInterval();
  };

  useEffect(() => {
    _sendRequest();
    // Don't watch body because it's likely to be a new object even if its shape hasn't changed.
  }, [path, method]);

  useEffect(() => {
    updateInterval();

    // Clean up intervals and inflight requests and corresponding state changes
    return () => {
      isOutdatedRequest = true;
      if (requestIntervalId.current) {
        clearTimeout(requestIntervalId.current);
      }
    };
  }, [interval]);

  return {
    isInitialRequest,
    isLoading,
    error,
    data,
    sendRequest: _sendRequest, // Gives the user the ability to manually request data
  };
};
