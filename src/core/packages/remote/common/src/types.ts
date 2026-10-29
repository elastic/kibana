/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceToken } from '@kbn/core-di';

export type RemotePlacement = 'executor' | 'coordinator';

/** `root` and `catalog` are constructed by the host; other executor providers are singletons. */
export type RemoteProviderRole = 'default' | 'root' | 'catalog';

export interface RemoteProviderDeclaration {
  readonly token: ServiceToken<unknown>;
  readonly placement: RemotePlacement;
  readonly modulePath: string;
  readonly exportName: string;
  readonly role?: RemoteProviderRole;
}

export interface RemoteContributionDeclaration {
  readonly kind: ServiceToken<unknown>;
  readonly stepType: string;
  readonly modulePath: string;
  readonly exportName: string;
}

/** Declared from `server/remote/index.ts`. That file must not import implementation modules. */
export interface RemoteModule {
  readonly providers?: readonly RemoteProviderDeclaration[];
  readonly contributions?: readonly RemoteContributionDeclaration[];
}

export interface RemoteWorkerSpec {
  readonly id: string;
  readonly root: {
    readonly tokenId: string;
    readonly modulePath: string;
    readonly exportName: string;
  };
  readonly catalog?: {
    readonly tokenId: string;
    readonly modulePath: string;
    readonly exportName: string;
  };
  readonly executorProviders: ReadonlyArray<{
    readonly tokenId: string;
    readonly modulePath: string;
    readonly exportName: string;
  }>;
  readonly contributions: ReadonlyArray<{
    readonly stepType: string;
    readonly modulePath: string;
    readonly exportName: string;
  }>;
  readonly coordinatorTokenIds: readonly string[];
}
