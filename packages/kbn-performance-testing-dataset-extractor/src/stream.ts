/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request, Stream } from './types';

export const getTime = (date: string) => new Date(date).getTime();

/**
 * Combines concurrent requests into the streams and returns it as Array
 * @param requests requests array
 */
export const requestsToStreams = <T extends Request>(requests: T[]) => {
  const sorted = requests.sort((a, b) => getTime(a.date) - getTime(b.date));
  const streams = new Map<string, Stream<T>>();

  for (const request of sorted) {
    const startTime = getTime(request.date) * 1000;
    const endTime = getTime(request.date) * 1000 + request.duration;
    // Checking if request starts before any existing stream ended
    const match = Array.from(streams.keys()).filter((key) => {
      const streamEndTimestamp = streams.get(key)?.endTime;
      return streamEndTimestamp ? startTime < streamEndTimestamp : false;
    });
    const stream = streams.get(match[0]);
    if (stream) {
      // Adding request to the existing stream
      stream.requests.push(request);
      // Updating the stream end time if needed
      if (endTime > stream.endTime) {
        stream.endTime = endTime;
      }
      // Saving the updated stream
      streams.set(match[0], stream);
    } else {
      // Otherwise adding a new stream
      streams.set(request.date, {
        startTime,
        endTime,
        requests: [request],
      });
    }
  }

  const values = Array.from(streams.values());
  return values.map((stream) => {
    return {
      startTime: new Date(stream.startTime / 1000).toISOString(),
      endTime: new Date(stream.endTime / 1000).toISOString(),
      requests: stream.requests,
    };
  });
};
