/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { workerData } from 'worker_threads';
import { ClusterClient } from '../elasticsearch/client';
import { LoggingSystem } from '../logging';
import { makeGetActionsFromMetricThreshold } from '../../../../x-pack/plugins/infra/server/lib/alerting/metric_threshold/worker';

let client: ClusterClient;

export function initialize(): { [key: string]: (...args: any[]) => unknown } {
  const { config, loggerContext, type, authHeaders, executionContext } = workerData;
  const loggingSystem = new LoggingSystem();
  const logger = loggingSystem.asLoggerFactory();
  // TODO create a StreamingAppender and share writable stream with all workers

  client = new ClusterClient({
    config,
    type,
    logger: logger.get(loggerContext),
    authHeaders, // TODO shared memory
    getExecutionContext: () => executionContext, // TODO shared memory
    getUnauthorizedErrorHandler: () => undefined, // TODO shared memory
  });

  return {
    myWorkerTask: async () => {
      const results = await client.asInternalUser.search({ index: '.kibana' });
      return JSON.stringify(results);
    },
    getActionsFromMetricThreshold: makeGetActionsFromMetricThreshold(client.asInternalUser),
  };
}
