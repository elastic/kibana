/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { CoreContext } from '@kbn/core-base-browser-internal';

function createCoreContext({ production = false }: { production?: boolean } = {}): CoreContext {
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
        dist: false,
      },
    },
  };
}

export const coreContextMock = {
  create: createCoreContext,
};
