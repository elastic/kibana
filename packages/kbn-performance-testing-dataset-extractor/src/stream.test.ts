/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { requestsToStreams, getTime } from './stream';

test('requests to stream', () => {
  const requests = new Array(
    {
      transactionId: 'a8ba23df51ebb853',
      spanId: '85c8de731132bea2',
      name: 'Elasticsearch: GET /.kibana_8.5.0/_doc/config%3A8.5.0',
      date: '2022-08-08T17:43:58.647Z',
      duration: 398,
      http: {
        method: 'GET',
        path: '/.kibana_8.5.0/_doc/config%3A8.5.0',
      },
    },
    {
      transactionId: '15ba53df5t9bb165',
      spanId: '15v8de5341v2neat',
      name: 'Elasticsearch: GET /.kibana_8.5.0/_doc/config%3A8.5.0',
      date: '2022-08-08T17:43:58.641Z',
      duration: 1988,
      http: {
        method: 'GET',
        path: '/.kibana_8.5.0/_doc/config%3A8.5.0',
      },
    },
    {
      transactionId: '90d8037a799382ac',
      spanId: 'b819755f297188d9',
      name: 'Elasticsearch: GET /_security/_authenticate',
      date: '2022-08-08T17:43:58.649Z',
      duration: 1002,
      http: {
        method: 'GET',
        path: '/_security/_authenticate',
      },
    },
    {
      transactionId: '1381d9ed5af967f9',
      spanId: '690d11ebfefd06ad',
      name: 'Elasticsearch: GET /.kibana_8.5.0/_doc/config%3A8.5.0',
      date: '2022-08-08T17:43:58.648Z',
      duration: 2400,
      http: {
        method: 'GET',
        path: '/.kibana_8.5.0/_doc/config%3A8.5.0',
      },
    },
    {
      transactionId: '96174ca1fbd14763',
      spanId: '4c81025cb74c9cd6',
      name: 'Elasticsearch: GET /_security/_authenticate',
      date: '2022-08-08T17:43:58.640Z',
      duration: 4166,
      http: {
        method: 'GET',
        path: '/_security/_authenticate',
      },
    }
  );

  const streams = requestsToStreams(requests);
  const sorted = requests.sort((a, b) => getTime(a.date) - getTime(b.date));

  expect(streams.length).toBe(3);
  expect(streams[0].requests.length).toBe(2);
  expect(streams[0].startTime).toBe(streams[0].requests[0].date);
  expect(streams[0].startTime).toBe(sorted[0].date);
  expect(streams[1].requests.length).toBe(1);
  expect(getTime(streams[1].startTime)).toBeGreaterThan(getTime(streams[0].endTime));
  expect(streams[2].requests.length).toBe(2);
});
