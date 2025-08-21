/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';

// Minimal shape we rely on, taken from Console's /api/console/api_server
export interface ConsoleSpecDefinitionsResponse {
  es: {
    name: string;
    globals: Record<string, unknown>;
    endpoints: Record<string, any>;
  };
}

let cache: ConsoleSpecDefinitionsResponse | null = null;
let inflight: Promise<ConsoleSpecDefinitionsResponse> | null = null;

export async function getConsoleSpecs(
  http?: HttpSetup
): Promise<ConsoleSpecDefinitionsResponse | null> {
  if (!http) return null;
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = http
    .get<ConsoleSpecDefinitionsResponse>('/api/console/api_server')
    .then((resp) => {
      cache = resp;
      return resp;
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.debug('Console specs fetch failed, will fallback to heuristics', e);
      return null as unknown as ConsoleSpecDefinitionsResponse;
    })
    .finally(() => {
      inflight = null;
    });

  const result = await inflight;
  return result ?? null;
}

export function getCachedConsoleSpecs(): ConsoleSpecDefinitionsResponse | null {
  return cache;
}
