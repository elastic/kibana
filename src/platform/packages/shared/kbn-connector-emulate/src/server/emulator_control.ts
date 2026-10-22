/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RejectedResponse, ResponseFixture } from '../engine/response_engine';
import type { ContractCall } from '../fetch/create_emulator_fetch';
import type { OperationDescription } from '../fetch/describe_operation';
import type { EmulatorOperation } from '../fetch/list_operations';
import { checkFixtures } from './check_fixtures';
import type { ControlledEmulator } from './controlled_emulator';
import type { EmulatorMcpOptions } from './emulator_mcp';
import { createEmulatorMcpHandler } from './emulator_mcp';

/** The path the control endpoints are served under, on the proxy's own origin. */
export const CONTROL_PATH = '/_mock';

// The most `PUT /_mock/fixtures` reads.
const MAX_FIXTURES_BODY = 10 * 1024 * 1024;

export interface EmulatorCalls {
  /** The calls from index `since` on, in the order they arrived. */
  readonly calls: readonly ContractCall[];
  /** How many calls the emulator holds; pass it as `since` to read only later calls. */
  readonly total: number;
}

/** Answers requests to the control endpoints; the proxy hands it requests under `CONTROL_PATH`. */
export type EmulatorControlHandler = (request: Request) => Promise<Response>;

export interface EmulatorControlOptions {
  /** Scopes every endpoint to one connector of an emulator combined by `combineEmulators`. */
  readonly connector?: string;
}

/** Reads, resets and steers a running emulator through its control endpoints. */
export interface EmulatorControl {
  /** The calls the emulator received, from index `since` (default 0) on. */
  readonly calls: (since?: number) => Promise<EmulatorCalls>;
  /** Empties the emulator's calls and responder state, and drops its runtime fixtures. */
  readonly reset: () => Promise<void>;
  /** The operations the emulator answers. */
  readonly operations: () => Promise<readonly EmulatorOperation[]>;
  /** What an OpenAPI operation accepts and answers, by its `id` as `operations` lists it. */
  readonly describeOperation: (
    id: string,
    options?: { readonly source?: string }
  ) => Promise<OperationDescription>;
  /**
   * Sets runtime fixtures, replacing those of the operations they name. Resolves to the
   * fixtures the spec rejects, in which case none is set.
   */
  readonly setFixtures: (
    fixtures: readonly ResponseFixture[]
  ) => Promise<readonly RejectedResponse[]>;
  /** The runtime fixtures in effect. */
  readonly getFixtures: () => Promise<readonly ResponseFixture[]>;
  /** Drops the runtime fixtures of one OpenAPI operation, or all of them. */
  readonly clearFixtures: (options?: {
    readonly id?: string;
    readonly source?: string;
  }) => Promise<void>;
}

type Answer = (
  request: Request,
  url: URL,
  connector: string | undefined
) => Response | Promise<Response>;

const problem = (status: number, title: string, detail: string, headers?: HeadersInit) =>
  Response.json({ title, detail }, { status, headers });

/** Returns whether a request path (with any query) is one of the control endpoints. */
export const isControlPath = (path: string): boolean =>
  path === CONTROL_PATH || /^\/_mock[/?]/.test(path);

const readFixtures = async (
  request: Request
): Promise<{ fixtures: ResponseFixture[] } | { error: string }> => {
  const text = await request.text();
  if (text.length > MAX_FIXTURES_BODY) {
    return { error: `The body is over ${MAX_FIXTURES_BODY} characters` };
  }
  try {
    return checkFixtures(JSON.parse(text));
  } catch {
    return { error: 'The body is not JSON' };
  }
};

const optional = (url: URL, name: string): string | undefined =>
  url.searchParams.get(name) ?? undefined;

/**
 * Serves an emulator's control endpoints, all as JSON: `GET /_mock/calls?since=<n>`,
 * `POST /_mock/reset`, `GET /_mock/operations`, `GET /_mock/operations/<id>`, and
 * `GET`, `PUT` and `DELETE /_mock/fixtures` for runtime fixtures; and an MCP server with tools
 * for the same at `/_mock/mcp`. For emulators combined by `combineEmulators`, each endpoint takes
 * `?connector=<id>` to see or change only that connector's emulator. They are for local test
 * runs and take no credentials.
 */
export const createEmulatorControlHandler = (
  emulator: ControlledEmulator,
  mcpOptions: EmulatorMcpOptions = {}
): EmulatorControlHandler => {
  const { calls, operations, reset, connectors, runtimeFixtures, describeOperation } = emulator;
  const mcp = createEmulatorMcpHandler(emulator, mcpOptions);
  const byConnector = <T extends { readonly connector?: string }>(
    items: readonly T[],
    connector: string | undefined
  ): readonly T[] =>
    connector === undefined ? items : items.filter((item) => item.connector === connector);
  const forMcp: Answer = (request) => mcp(request);

  const routes: Record<string, Record<string, Answer>> = {
    [`${CONTROL_PATH}/mcp`]: { POST: forMcp, GET: forMcp, DELETE: forMcp },
    [`${CONTROL_PATH}/calls`]: {
      GET: (_request, { searchParams }, connector) => {
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
      POST: (_request, _url, connector) => {
        reset(connector);
        return new Response(null, { status: 204 });
      },
    },
    [`${CONTROL_PATH}/operations`]: {
      GET: (_request, _url, connector) =>
        Response.json({ operations: byConnector(operations, connector) }),
    },
    [`${CONTROL_PATH}/fixtures`]: {
      GET: (_request, _url, connector) =>
        Response.json({ fixtures: runtimeFixtures.list({ connector }) }),
      PUT: async (request, _url, connector) => {
        const read = await readFixtures(request);
        if ('error' in read) {
          return problem(400, 'Invalid fixtures', read.error);
        }
        const rejected = runtimeFixtures.set(read.fixtures, { connector });
        if (rejected.length > 0) {
          return Response.json(
            {
              title: 'Fixtures rejected',
              detail: 'The spec rejects these fixtures, so none was set',
              rejected,
            },
            { status: 400 }
          );
        }
        return Response.json({ fixtures: runtimeFixtures.list({ connector }) });
      },
      DELETE: (_request, url, connector) => {
        runtimeFixtures.clear({
          id: optional(url, 'operation'),
          source: optional(url, 'source'),
          connector,
        });
        return new Response(null, { status: 204 });
      },
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

  const operationPrefix = `${CONTROL_PATH}/operations/`;
  const describe: Record<string, Answer> = {
    GET: (_request, url, connector) => {
      const id = decodeURIComponent(url.pathname.slice(operationPrefix.length));
      const description = describeOperation(id, { source: optional(url, 'source'), connector });
      return description
        ? Response.json(description)
        : problem(404, 'No such operation', `No OpenAPI operation has the id ${id}`);
    },
  };

  return async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '');
    const methods =
      routes[pathname] ?? (pathname.startsWith(operationPrefix) ? describe : undefined);
    if (!methods) {
      return problem(
        404,
        'No control endpoint',
        `${url.pathname}: the control endpoints are ${[
          ...Object.keys(routes),
          `${operationPrefix}<id>`,
        ].join(', ')}`
      );
    }
    const answer = methods[request.method] ?? (request.method === 'HEAD' ? methods.GET : undefined);
    if (!answer) {
      const allowed = Object.keys(methods).join(', ');
      return problem(405, 'Method not allowed', `${url.pathname} only answers ${allowed}`, {
        allow: allowed,
      });
    }
    // The MCP server takes the connector as a tool argument instead.
    const connector =
      methods === routes[`${CONTROL_PATH}/mcp`] ? undefined : optional(url, 'connector');
    const invalid = connector === undefined ? undefined : connectorProblem(connector);
    return invalid ?? answer(request, url, connector);
  };
};

const send = async (url: URL, method: string, body?: unknown): Promise<Response> => {
  const response = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
  });
  if (!response.ok) {
    throw new Error(`${method} ${url} failed with ${response.status}: ${await response.text()}`);
  }
  return response;
};

/**
 * Returns a client for the control endpoints of an emulator served by `createEmulatorProxy` at
 * `proxyUrl`, e.g. for a Scout or FTR test that drives Kibana against the emulator. With
 * `connector`, it sees and changes only that connector's emulator of a combined emulator.
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
  const withSource = (url: URL, source?: string) => {
    if (source !== undefined) {
      url.searchParams.set('source', source);
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
    describeOperation: async (id, { source } = {}) =>
      (
        await send(withSource(endpoint(`operations/${encodeURIComponent(id)}`), source), 'GET')
      ).json(),
    setFixtures: async (fixtures) => {
      const response = await fetch(endpoint('fixtures'), {
        method: 'PUT',
        body: JSON.stringify({ fixtures }),
        headers: { 'content-type': 'application/json' },
      });
      const body = await response.json();
      if (response.ok) {
        return [];
      }
      if (Array.isArray(body?.rejected)) {
        return body.rejected;
      }
      throw new Error(
        `PUT ${endpoint('fixtures')} failed with ${response.status}: ${body?.detail}`
      );
    },
    getFixtures: async () => (await (await send(endpoint('fixtures'), 'GET')).json()).fixtures,
    clearFixtures: async ({ id, source } = {}) => {
      const url = withSource(endpoint('fixtures'), source);
      if (id !== undefined) {
        url.searchParams.set('operation', id);
      }
      await send(url, 'DELETE');
    },
  };
};
