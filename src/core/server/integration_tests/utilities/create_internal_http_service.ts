/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import { HttpService } from '@kbn/core-http-server-internal';
import { createCoreContext } from '@kbn/core-http-server-mocks';

export {
  HttpService,
  type InternalHttpServicePreboot,
  type InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';

/**
 * @internal
 * @remarks Only use this in core-owned code!
 */
export const createInternalHttpService = ({
  buildNum,
  ...overrides
}: Partial<CoreContext & { buildNum: number }> = {}): HttpService => {
  const ctx = createCoreContext(overrides);
  if (buildNum !== undefined) {
    ctx.env = {
      ...ctx.env,
      packageInfo: {
        ...ctx.env.packageInfo,
        buildNum,
      },
    };
  }
  return new HttpService(ctx);
};
