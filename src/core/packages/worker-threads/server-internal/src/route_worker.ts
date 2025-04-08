/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import { workerData } from 'piscina';
import type { RouteWorkerParams } from '@kbn/core-worker-threads-server/src/types';
import { initialize } from './initialize_worker';
import type { InternalRouteWorkerData, InternalRouteWorkerParams } from './types';
import { createWorkerThreadRequestContext } from './create_worker_threads_request_context';

const { services } = workerData as InternalRouteWorkerData;

export const getRouteWorkerHandler = async () => {
  const {
    context: {
      core: { elasticsearch, uiSettings },
      logger,
    },
    run,
  } = await initialize({ services });

  return ({
    filename,
    input,
    request: fakeRawRequest,
    signal,
    rpc: { savedObjects },
  }: InternalRouteWorkerParams) => {
    const request = CoreKibanaRequest.from(fakeRawRequest);

    return run<RouteWorkerParams>({
      filename,
      input,
      signal,
      request,
      core: createWorkerThreadRequestContext({
        request,
        elasticsearchStart$: elasticsearch.start$,
        uiSettingsStart$: uiSettings.start$,
        savedObjects: {
          namespace: savedObjects.namespace,
          port: savedObjects.port,
        },
        logger,
      }),
    });
  };
};
