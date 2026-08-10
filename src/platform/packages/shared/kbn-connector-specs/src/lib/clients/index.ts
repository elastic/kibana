/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MongoClient } from 'mongodb';
import type { ClientTypeSpec } from './client_type_spec';
import { mongodbClientType } from './mongodb_client_type';

export type {
  ClientTypeSpec,
  BuildContext,
  ConnectorNetworkSettings,
  ConnectorResponseSettings,
  CredentialAccessor,
} from './client_type_spec';

export interface ClientRegistry {
  mongodb: MongoClient;
}

export type ClientTypeId = keyof ClientRegistry;

export type ClientTypeSpecs = Readonly<{
  [K in ClientTypeId]: ClientTypeSpec<ClientRegistry[K]>;
}>;

export const clientTypes: ClientTypeSpecs = {
  mongodb: mongodbClientType,
};
