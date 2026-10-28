/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RemoteModule } from '@kbn/core-remote-common';
import { OtherCapabilityToken, OtherCatalogToken, OtherRootToken, OtherStepKind } from './tokens';

export const remoteModule: RemoteModule = {
  providers: [
    {
      token: OtherCapabilityToken,
      placement: 'coordinator',
      modulePath: require.resolve('./capability'),
      exportName: 'OtherCapability',
    },
    {
      token: OtherCatalogToken,
      placement: 'executor',
      role: 'catalog',
      modulePath: require.resolve('./catalog'),
      exportName: 'OtherCatalog',
    },
    {
      token: OtherRootToken,
      placement: 'executor',
      role: 'root',
      modulePath: require.resolve('./root'),
      exportName: 'OtherRoot',
    },
  ],
  contributions: [
    {
      kind: OtherStepKind,
      stepType: 'other.step',
      modulePath: require.resolve('./root'),
      exportName: 'OtherRoot',
    },
  ],
};
