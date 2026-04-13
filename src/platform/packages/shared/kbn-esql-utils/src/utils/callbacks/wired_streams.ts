/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { Streams } from '@kbn/streams-schema';
import { cacheParametrizedAsyncFunction } from './utils/cache';

const STREAMS_API = '/api/streams';
const API_VERSION = '2023-10-31';

/**
 * Retruns a list of all the wired streams.
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to the wired streams list.
 */
export const getWiredStreams = cacheParametrizedAsyncFunction(
  async (http: HttpStart): Promise<Streams.WiredStream.Definition[]> => {
    const result = await http
      .get<{ streams: Streams.WiredStream.Definition[] }>(STREAMS_API, {
        version: API_VERSION,
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch wired streams', error);
        return { streams: [] };
      });

    return result.streams;
  },
  (http: HttpStart) => 'wired_streams',
  1000 * 60 * 5, // Keep the value in cache for 5 minutes
  1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
);
