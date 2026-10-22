/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, Emulator } from '../fetch/create_emulator_fetch';
import type { EmulatorOperation } from '../fetch/list_operations';

/** The path the control endpoints are served under, on the proxy's own origin. */
export const CONTROL_PATH = '/_mock';

export interface EmulatorCalls {
  /** The calls from index `since` on, in the order they arrived. */
  readonly calls: readonly ContractCall[];
  /** How many calls the emulator holds; pass it as `since` to read only later calls. */
  readonly total: number;
}

/** Answers requests to the control endpoints; the proxy hands it requests under `CONTROL_PATH`. */
export type EmulatorControlHandler = (request: Request) => Promise<Response>;

/** What the control endpoints serve: an emulator, or several combined by `combineEmulators`. */
export interface ControlledEmulator extends Pick<Emulator, 'calls' | 'operations'> {
  /** Empties the calls of `connector`, or all calls. */
  readonly reset: (connector?: string) => void;
  /** Set for combined emulators: the connectors `?connector=` can scope the endpoints to. */
  readonly connectors?: readonly string[];
}

export interface EmulatorControlOptions {
  /** Scopes every endpoint to one connector of an emulator combined by `combineEmulators`. */
  readonly connector?: string;
}

/** Reads and resets a running emulator through its control endpoints. */
export interface EmulatorControl {
  /** The calls the emulator received, from index `since` (default 0) on. */
  readonly calls: (since?: number) => Promise<EmulatorCalls>;
  /** Empties the emulator's calls. */
  readonly reset: () => Promise<void>;
  /** The operations the emulator answers. */
  readonly operations: () => Promise<readonly EmulatorOperation[]>;
}

const problem = (status: number, title: string, detail: string, headers?: HeadersInit) =>
  Response.json({ title, detail }, { status, headers });

/** Returns whether a request path (with any query) is one of the control endpoints. */
export const isControlPath = (path: string): boolean =>
  path === CONTROL_PATH || /^\/_mock[/?]/.test(path);

/**
 * Serves an emulator's control endpoints: `GET /_mock/calls?since=<n>`, `POST /_mock/reset` and
 * `GET /_mock/operations`, all as JSON. For emulators combined by `combineEmulators`, each takes
 * `?connector=<id>` to see or reset only that connector's calls and operations. They are for
 * local test runs and take no credentials.
 */
export const createEmulatorControlHandler = ({
  calls,
  operations,
  reset,
  connectors,
}: ControlledEmulator): EmulatorControlHandler => {
  const byConnector = <T extends { readonly connector?: string }>(
    items: readonly T[],
    connector: string | undefined
  ): readonly T[] =>
    connector === undefined ? items : items.filter((item) => item.connector === connector);

  const routes: Record<
    string,
    { method: string; answer: (request: { url: URL; connector?: string }) => Response }
  > = {
    [`${CONTROL_PATH}/calls`]: {
      method: 'GET',
      answer: ({ url: { searchParams }, connector }) => {
        const since = Number(searchParams.get('since') ?? 0);
        if (!Number.isSafeInteger(since) || since < 0) {
          return problem(400, 'Invalid since', 'since must be a non-negative integer');
        }
        const scoped = byConnector(calls, connector);
        const body: EmulatorCalls = { calls: scoped.slice(since), total: scoped.length };
        return Response.json(body);
      },
    },
    [`${CONTROL_PATH}/reset`]: {
      method: 'POST',
      answer: ({ connector }) => {
        reset(connector);
        return new Response(null, { status: 204 });
      },
    },
    [`${CONTROL_PATH}/operations`]: {
      method: 'GET',
      answer: ({ connector }) => Response.json({ operations: byConnector(operations, connector) }),
    },
  };

  // Rejects ?connector= for a single emulator, and connectors it doesn't combine.
  const connectorProblem = (connector: string): Response | undefined => {
    if (!connectors) {
      return problem(
        400,
        'Not a combined emulator',
        `connector=${connector}: the emulator serves one connector; omit the connector parameter`
      );
    }
    if (!connectors.includes(connector)) {
      return problem(
        400,
        'Unknown connector',
        `connector=${connector}: the emulator serves ${connectors.join(', ')}`
      );
    }
  };

  return async (request) => {
    const url = new URL(request.url);
    const route = routes[url.pathname.replace(/\/$/, '')];
    if (!route) {
      return problem(
        404,
        'No control endpoint',
        `${url.pathname}: the control endpoints are ${Object.keys(routes).join(', ')}`
      );
    }
    if (request.method !== route.method && !(request.method === 'HEAD' && route.method === 'GET')) {
      return problem(405, 'Method not allowed', `${url.pathname} only answers ${route.method}`, {
        allow: route.method,
      });
    }
    const connector = url.searchParams.get('connector') ?? undefined;
    const invalid = connector === undefined ? undefined : connectorProblem(connector);
    return invalid ?? route.answer({ url, connector });
  };
};

const send = async (url: URL, method: string): Promise<Response> => {
  const response = await fetch(url, { method });
  if (!response.ok) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${await response.text()}`);
  }
  return response;
};

/**
 * Returns a client for the control endpoints of an emulator served by `createEmulatorProxy` at
 * `proxyUrl`, e.g. for a Scout or FTR test that drives Kibana against the emulator. With
 * `connector`, it sees and resets only that connector's calls of a combined emulator.
 */
export const createEmulatorControl = (
  proxyUrl: string | URL,
  { connector }: EmulatorControlOptions = {}
): EmulatorControl => {
  const endpoint = (path: string) => {
    const url = new URL(`${CONTROL_PATH}/${path}`, proxyUrl);
    if (connector !== undefined) {
      url.searchParams.set('connector', connector);
    }
    return url;
  };
  return {
    calls: async (since = 0) => {
      const url = endpoint('calls');
      url.searchParams.set('since', String(since));
      return (await send(url, 'GET')).json();
    },
    reset: async () => {
      await send(endpoint('reset'), 'POST');
    },
    operations: async () => (await (await send(endpoint('operations'), 'GET')).json()).operations,
  };
};
