/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workerData } from 'piscina';
import { RouteWorker } from '@kbn/core-worker-threads-server/src/types';
import { InternalRouteWorkerData, InternalRouteWorkerParams } from './types';
import { initialize } from './initialize_worker';

const { services } = workerData as InternalRouteWorkerData;

// eslint-disable-next-line import/no-default-export
export default initialize({ services }).then((cb) => {
  return async ({ filename, input, request, signal, port }: InternalRouteWorkerParams) => {
    const { elasticsearch, logger } = await cb({ port });

    const worker = (await import(filename)) as RouteWorker<any, any>;

    return worker.run({
      input,
      core: {
        elasticsearch: {
          client: elasticsearch.client.asScoped(request),
        },
      },
      signal,
      logger,
      port,
    });
  };
});
