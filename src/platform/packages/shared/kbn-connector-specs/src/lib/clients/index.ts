/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { McpClient } from '@kbn/mcp-client';
import type { ClientTypeSpec } from './client_type_spec';
import { createMcpClientType } from './mcp_client_type';

export { createMcpClientType } from './mcp_client_type';
export type { McpClientTypeDeps } from './mcp_client_type';

export type {
  ClientTypeSpec,
  BuildContext,
  ConnectorNetwork,
  CredentialAccessor,
} from './client_type_spec';

export type {
  FetchLike,
  ConfiguredFetchResource,
  ConfiguredFetchOptions,
  ConfiguredFetchFactory,
} from './configured_fetch_types';

export interface ClientRegistry {
  mcp: McpClient;
}

export type ClientTypeId = keyof ClientRegistry;

export type ClientTypeSpecs = Readonly<{
  [K in ClientTypeId]: ClientTypeSpec<ClientRegistry[K]>;
}>;

export const clientTypes: ClientTypeSpecs = {
  mcp: createMcpClientType(),
};
