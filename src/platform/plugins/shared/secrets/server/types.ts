/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ISecretClient } from '../common/types';

export type SecretsRequestHandlerContext = CustomRequestHandlerContext<{
  secrets: {
    secretClient: ISecretClient;
  };
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SecretsServerPluginSetup {}

export interface SecretsServerPluginStart {
  getSecretClientWithRequest: (request: KibanaRequest) => ISecretClient;
}

export interface SecretsServerPluginSetupDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface SecretsServerPluginStartDeps {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}
