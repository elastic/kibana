/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, HttpFetchError } from '@kbn/core/public';
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
