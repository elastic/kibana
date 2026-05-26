/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';

import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
import type { IUserStorageClient } from '@kbn/core-user-storage-browser';

import { UserStorageApi } from './user_storage_api';
import { UserStorageClient } from './user_storage_client';

export interface UserStorageServiceDeps {
  http: InternalHttpSetup;
  injectedMetadata: InternalInjectedMetadataSetup;
}

/**
 * Browser core service that owns the lifecycle of the {@link IUserStorageClient}.
 *
 * @internal
 */
export class UserStorageService {
  private client?: UserStorageClient;
  private readonly done$ = new Subject<void>();

  public setup({ http, injectedMetadata }: UserStorageServiceDeps): IUserStorageClient {
    const api = new UserStorageApi(http);
    const initialValues = injectedMetadata.getUserStorage().values;

    this.client = new UserStorageClient({
      api,
      initialValues,
      done$: this.done$,
    });

    return this.client;
  }

  public start(): IUserStorageClient {
    return this.client!;
  }

  public stop() {
    this.done$.next();
    this.done$.complete();
  }
}
