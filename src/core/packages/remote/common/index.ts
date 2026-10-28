/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { expose, wrapRpcResult } from './src/expose';
export { openPortSession } from './src/message_port_session';
export { isRemotableInstance, remotable } from './src/remotable';
export { remoteTokenId } from './src/token_id';
export type {
  RemoteContributionDeclaration,
  RemoteModule,
  RemotePlacement,
  RemoteProviderDeclaration,
  RemoteProviderRole,
  RemoteWorkerSpec,
} from './src/types';
