/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { IUserStorageClient } from '@kbn/core-user-storage-browser';
export interface UserStorageServiceDeps {
  http: InternalHttpSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
}
/**
 * Browser core service that owns the lifecycle of the {@link IUserStorageClient}.
 *
 * @internal
 */
export declare class UserStorageService {
  private client?;
  private readonly done$;
  setup({ http, injectedMetadata }: UserStorageServiceDeps): IUserStorageClient;
  start(): IUserStorageClient;
  stop(): void;
}
