/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

export interface RecordedRequest {
  method?: string;
  url?: string;
  /** Headers after Axios merged the instance defaults with the request config, as they go on the wire. */
  headers: Record<string, unknown>;
}

export interface RecordingAxiosClient {
  client: AxiosInstance;
  requests: RecordedRequest[];
}

/**
 * Test helper: a real Axios instance whose default headers mimic a configured connector auth type
 * (e.g. a bearer token). Requests are recorded with their effective headers instead of being sent,
 * so tests can assert what a handler actually puts on the wire after Axios merges the defaults.
 */
export const createRecordingAxiosClient = (
  defaultHeaders: Record<string, string>,
  respond: (url?: string) => Pick<AxiosResponse, 'data' | 'status' | 'headers'> = () => ({
    data: {},
    status: 200,
    headers: {},
  })
): RecordingAxiosClient => {
  const requests: RecordedRequest[] = [];
  const client = axios.create({
    adapter: async (config) => {
      requests.push({
        method: config.method,
        url: config.url,
        headers: config.headers.toJSON() as Record<string, unknown>,
      });
      return { ...respond(config.url), statusText: 'OK', config };
    },
  });
  Object.assign(client.defaults.headers.common, defaultHeaders);
  return { client, requests };
};
