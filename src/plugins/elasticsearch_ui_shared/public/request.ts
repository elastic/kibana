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
  const sendRequest = async ({
    path,
    method,
    body,
  }: SendRequest): Promise<Partial<SendRequestResponse>> => {
    try {
      const response = await httpClient[method](path, body);

      if (typeof response.data === 'undefined') {
        throw new Error(response.statusText);
      }

      return {
        data: response.data,
      };
    } catch (e) {
      return {
        error: e.response ? e.response : e,
      };
    }
  };

  const useRequest = ({ path, method, body, interval, initialData, onSuccess }: UseRequest) => {
    // Main states for tracking request status and data
    const [error, setError] = useState<null | any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<any>(initialData);

    // States for tracking polling
    const [polling, setPolling] = useState<boolean>(false);
    const [currentInterval, setCurrentInterval] = useState<UseRequest['interval']>(interval);
    const intervalRequest = useRef<any>(null);
    const isFirstRequest = useRef<boolean>(true);

    // Tied to every render and bound to each request.
    let isOutdatedRequest = false;

    const request = async () => {
      const isPollRequest = currentInterval && !isFirstRequest.current;

      // Don't reset main error/loading states if we are doing polling
      if (isPollRequest) {
        setPolling(true);
      } else {
        setError(null);
        setData(initialData);
        setLoading(true);
        setPolling(false);
      }

      const requestBody = {
        path,
        method,
        body,
      };

      const response = await sendRequest(requestBody);

      if (onSuccess) {
        onSuccess(response);
      }

      // Don't update state if an outdated request has resolved.
      if (isOutdatedRequest) {
        return;
      }

      // Set just data if we are doing polling
      if (isPollRequest) {
        setPolling(false);
        if (response.data) {
          setData(response.data);
        }
      } else {
        setError(response.error);
        setData(response.data);
        setLoading(false);
      }

      isFirstRequest.current = false;
    };

    const cancelOutdatedRequest = () => {
      isOutdatedRequest = true;
    };

    useEffect(() => {
      // Perform request
      request();

      // Clear current interval
      if (intervalRequest.current) {
        clearInterval(intervalRequest.current);
      }

      // Set new interval
      if (currentInterval) {
        intervalRequest.current = setInterval(request, currentInterval);
      }

      // Cleanup intervals and inflight requests and corresponding state changes
      return () => {
        cancelOutdatedRequest();
        if (intervalRequest.current) {
          clearInterval(intervalRequest.current);
        }
      };
    }, [path, currentInterval]);

    return {
      error,
      loading,
      data,
      request,
      polling,
      changeInterval: (newInterval: UseRequest['interval']) => {
        // Allow changing polling interval if there was one set
        if (!interval) {
          return;
        }
        setCurrentInterval(newInterval);
      },
    };
  };

  return {
    sendRequest,
    useRequest,
  };
}
