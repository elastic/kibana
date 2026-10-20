/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractProtocol } from '../contract/types';
import type { ContractOperation } from '../openapi';

/** An HTTP operation of an OpenAPI spec the emulator answers. */
export interface EmulatorHttpOperation {
  readonly protocol: 'openapi';
  /** The `operationId`, or `METHOD /path` when the spec declares none. */
  readonly id: string;
  /** Uppercase HTTP method. */
  readonly method: string;
  readonly path: string;
  /** The server URLs the operation is served at, with any `{variables}` left in. */
  readonly servers: readonly string[];
  readonly source?: string;
}

/** An operation of a GraphQL or MCP spec the emulator answers, e.g. `query boards`. */
export interface EmulatorNamedOperation {
  readonly protocol: 'graphql' | 'mcp';
  /** The name `ContractCall.operation` gives it, e.g. `query boards` or `tools/call search`. */
  readonly name: string;
  readonly readOnly: boolean;
  readonly endpoints: readonly string[];
  readonly source?: string;
}

export type EmulatorOperation = EmulatorHttpOperation | EmulatorNamedOperation;

export interface LoadedProtocol {
  readonly source?: string;
  readonly protocol: EmulatorNamedOperation['protocol'];
  readonly instance: ContractProtocol;
}

/** Lists the operations of the loaded specs, in spec order. */
export const listOperations = (
  operations: readonly ContractOperation[],
  protocols: readonly LoadedProtocol[]
): EmulatorOperation[] => [
  ...operations.map(
    ({ id, method, path, servers, spec: { source } }): EmulatorHttpOperation => ({
      protocol: 'openapi',
      id,
      method: method.toUpperCase(),
      path,
      servers: servers.map(({ url }) => url),
      ...(source === undefined ? {} : { source }),
    })
  ),
  ...protocols.flatMap(({ protocol, instance: { endpoints, operations: named } }) =>
    named.map(
      ({ name, readOnly, source }): EmulatorNamedOperation => ({
        protocol,
        name,
        readOnly,
        endpoints,
        ...(source === undefined ? {} : { source }),
      })
    )
  ),
];
