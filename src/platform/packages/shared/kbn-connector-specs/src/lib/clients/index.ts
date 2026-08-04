/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ClientTypeSpec } from './client_type_spec';

export type {
  ClientTypeSpec,
  BuildContext,
  ConnectorNetwork,
  ConnectorResponseSettings,
  CredentialAccessor,
} from './client_type_spec';

// No client types are registered yet. `ClientTypeId` resolves to `never`
// until a client type is added to `ClientRegistry`.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ClientRegistry {}

export type ClientTypeId = keyof ClientRegistry;

export type ClientTypeSpecs = Readonly<{
  [K in ClientTypeId]: ClientTypeSpec<ClientRegistry[K]>;
}>;

export const clientTypes: ClientTypeSpecs = {};
