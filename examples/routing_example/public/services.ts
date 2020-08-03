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

import { CoreStart, HttpFetchError } from 'kibana/public';
import {
  RANDOM_NUMBER_ROUTE_PATH,
  RANDOM_NUMBER_BETWEEN_ROUTE_PATH,
  POST_MESSAGE_ROUTE_PATH,
  INTERNAL_GET_MESSAGE_BY_ID_ROUTE,
} from '../common';

export interface Services {
  fetchRandomNumber: () => Promise<number | HttpFetchError>;
  fetchRandomNumberBetween: (max: number) => Promise<number | HttpFetchError>;
  postMessage: (message: string, id: string) => Promise<undefined | HttpFetchError>;
  getMessageById: (id: string) => Promise<string | HttpFetchError>;
  addSuccessToast: (message: string) => void;
}

export function getServices(core: CoreStart): Services {
  return {
    addSuccessToast: (message: string) => core.notifications.toasts.addSuccess(message),
    fetchRandomNumber: async () => {
      try {
        const response = await core.http.fetch<{ randomNumber: number }>(RANDOM_NUMBER_ROUTE_PATH);
        return response.randomNumber;
      } catch (e) {
        return e;
      }
    },
    fetchRandomNumberBetween: async (max: number) => {
      try {
        const response = await core.http.fetch<{ randomNumber: number }>(
          RANDOM_NUMBER_BETWEEN_ROUTE_PATH,
          { query: { max } }
        );
        return response.randomNumber;
      } catch (e) {
        return e;
      }
    },
    postMessage: async (message: string, id: string) => {
      try {
        await core.http.post(`${POST_MESSAGE_ROUTE_PATH}/${id}`, {
          body: JSON.stringify({ message }),
        });
      } catch (e) {
        return e;
      }
    },
    getMessageById: async (id: string) => {
      try {
        const response = await core.http.get<{ message: string }>(
          `${INTERNAL_GET_MESSAGE_BY_ID_ROUTE}/${id}`
        );
        return response.message;
      } catch (e) {
        return e;
      }
    },
  };
}
