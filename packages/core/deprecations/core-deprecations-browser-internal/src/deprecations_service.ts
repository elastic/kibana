/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { DeprecationsServiceStart } from '@kbn/core-deprecations-browser';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import { DeprecationsClient } from './deprecations_client';

export class DeprecationsService implements CoreService<void, DeprecationsServiceStart> {
  public setup(): void {}

  public start({ http }: { http: InternalHttpStart }): DeprecationsServiceStart {
    const deprecationsClient = new DeprecationsClient({ http });

    return {
      getAllDeprecations: deprecationsClient.getAllDeprecations,
      getDeprecations: deprecationsClient.getDeprecations,
      isDeprecationResolvable: deprecationsClient.isDeprecationResolvable,
      resolveDeprecation: deprecationsClient.resolveDeprecation,
    };
  }

  public stop(): void {}
}
