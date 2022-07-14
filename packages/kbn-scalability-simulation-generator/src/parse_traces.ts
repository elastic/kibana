/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TraceItem } from './types/journey';
import { Request } from './types/simulation';

export const getHttpRequests = (traces: readonly TraceItem[]): Request[] => {
  return traces
    .map((trace) => {
      const timestamp = new Date(trace.timestamp).getTime();
      const date = trace.timestamp;
      const transactionId = trace.transaction.id;
      const method = trace.request.method;
      const path = trace.request.url.path;
      const rawHeaders = trace.request.headers;
      const headers = Object.keys(rawHeaders).map((key) => ({
        name: key,
        value: String(rawHeaders[key].join('')),
      }));
      const body = trace.request.body;
      return { timestamp, date, transactionId, method, path, headers, body };
    })
    .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
};
