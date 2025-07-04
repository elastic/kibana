/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type { CoreContext } from '@kbn/core-base-browser-internal';

function createCoreContext({ production = false }: { production?: boolean } = {}): CoreContext & {
  logger: MockedLogger;
} {
  return {
    coreId: Symbol('core context mock'),
    logger: loggerMock.create(),
    env: {
      mode: {
        dev: !production,
        name: production ? 'production' : 'development',
        prod: production,
      },
      packageInfo: {
        version: 'version',
        branch: 'branch',
        buildNum: 100,
        buildSha: 'buildSha',
        buildShaShort: 'buildShaShort',
        dist: false,
        buildDate: new Date('2023-05-15T23:12:09.000Z'),
        buildFlavor: 'traditional',
      },
    },
  };
}

export const coreContextMock = {
  create: createCoreContext,
};
