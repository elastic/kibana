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
  onSuccess?: any;
}

export function createRequestService(httpClient: any) {
  const _sendRequest = async ({
    path,
    method,
    body,
  }: SendRequest): Promise<Partial<SendRequestResponse>> => {
    try {
      // NOTE: This is tightly coupled to Angular's $http service.
      const response = await httpClient[method](path, body);

      if (typeof response.data === 'undefined') {
        throw new Error(response.statusText);
      }

      return response;
    } catch (e) {
      return {
        error: e.response ? e.response : e,
      };
    }
  };

  const useRequest = ({ path, method, body, interval, initialData, onSuccess }: UseRequest) => {
    // Main states for tracking request status and data
    const [error, setError] = useState<null | any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [data, setData] = useState<any>(initialData);

    // States for tracking polling
    const [requestInterval, setRequestInterval] = useState<UseRequest['interval']>(interval);
    // Consumers can use isInitialRequest to implement a polling UX.
    const [isInitialRequest, setIsInitialRequest] = useState<boolean>(true);
    const requestIntervalId = useRef<any>(null);

    // Tied to every render and bound to each request.
    let isOutdatedRequest = false;

    const sendRequest = async () => {
      // We don't clear error or data, so it's up to the consumer to decide whether to display the
      // "old" error/data or loading state when a new request is in-flight.
      setIsLoading(true);

      const requestBody = {
        path,
        method,
        body,
      };

      const response = await _sendRequest(requestBody);

      if (onSuccess) {
        onSuccess(response);
      }

      // Don't update state if an outdated request has resolved.
      if (isOutdatedRequest) {
        return;
      }

      setError(response.error);
      setData(response.data);
      setIsLoading(false);
      setIsInitialRequest(false);
    };

    const cancelOutdatedRequest = () => {
      isOutdatedRequest = true;
    };

    const updateInterval = () => {
      // Clear current interval
      if (requestIntervalId.current) {
        clearInterval(requestIntervalId.current);
      }

      // Set new interval
      if (requestInterval) {
        requestIntervalId.current = setInterval(sendRequest, requestInterval);
      }

      // Clean up intervals and inflight requests and corresponding state changes
      return () => {
        cancelOutdatedRequest();
        if (requestIntervalId.current) {
          clearInterval(requestIntervalId.current);
        }
      };
    };

    useEffect(() => {
      sendRequest();
      // We need to update the interval so that the scheduled request uses the new path, mathod, and body.
      return updateInterval();
    }, [path, method, body]);

    useEffect(() => {
      return updateInterval();
    }, [requestInterval]);

    return {
      isInitialRequest,
      isLoading,
      error,
      data,
      sendRequest, // Gives the user the ability to manually request data
      setRequestInterval: (newInterval: UseRequest['interval']) => {
        // The consumer can set this to undefined to stop polling, or to a number to begin polling.
        setRequestInterval(newInterval);
        updateInterval();
      },
    };
  };

  return {
    sendRequest: _sendRequest,
    useRequest,
  };
}
