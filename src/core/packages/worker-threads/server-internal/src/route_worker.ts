/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { RouteWorker } from '@kbn/core-worker-threads-server/src/types';
import { workerData } from 'piscina';
import { createLazyRouteContext } from './create_lazy_route_context';
import { initialize } from './initialize_worker';
import type { InternalRouteWorkerData, InternalRouteWorkerParams } from './types';

const { services } = workerData as InternalRouteWorkerData;

// eslint-disable-next-line import/no-default-export
export default initialize({ services }).then(
  ({ elasticsearch, savedObjects, uiSettings, logger }) => {
    return async ({
      filename,
      input,
      request: fakeRawRequest,
      signal,
    }: InternalRouteWorkerParams) => {
      const worker = (await import(filename)) as RouteWorker<any, any>;

      const request = CoreKibanaRequest.from(fakeRawRequest);

      return worker.run({
        input,
        core: createLazyRouteContext({
          request,
          elasticsearchStart$: elasticsearch.start$,
          savedObjectsStart$: savedObjects.start$,
          uiSettingsStart$: uiSettings.start$,
        }),
        signal,
        logger,
        request,
      });
    };
  }
);
