/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RemoteModule } from '@kbn/core-remote-common';
import { DemoCatalogToken, DemoRootToken, DemoStepKind, EchoToken } from './tokens';

export { DemoCatalogToken, DemoRootToken, DemoStepKind, EchoToken } from './tokens';

export const remoteModule: RemoteModule = {
  providers: [
    {
      token: EchoToken,
      placement: 'coordinator',
      modulePath: require.resolve('./echo'),
      exportName: 'Echo',
    },
    {
      token: DemoCatalogToken,
      placement: 'executor',
      role: 'catalog',
      modulePath: require.resolve('./catalog'),
      exportName: 'DemoCatalog',
    },
    {
      token: DemoRootToken,
      placement: 'executor',
      role: 'root',
      modulePath: require.resolve('./root'),
      exportName: 'Root',
    },
  ],
  contributions: [
    {
      kind: DemoStepKind,
      stepType: 'demo.echoStep',
      modulePath: require.resolve('./step'),
      exportName: 'EchoStep',
    },
  ],
};
