/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: delete this once ES client can be used for Connectors API

import { ConnectorSyncJob, Connector } from './connectors';

export interface ConnectorAPIListConnectorsResponse {
  count: number;
  results: Connector[];
}
export interface ConnectorsAPISyncJobResponse {
  count: number;
  results: ConnectorSyncJob[];
}

export interface ConnectorSecretCreateResponse {
  id: string;
}
