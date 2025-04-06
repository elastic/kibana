/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigService } from '@kbn/config/src/config_service';
import { Env } from '@kbn/config/src/env';
import { registerServiceConfig } from '@kbn/core-root-server-internal/src/register_service_config';
import { AnalyticsService } from '@kbn/core-analytics-server-internal/src/analytics_service';
import { TransferableConstructor, kDeserialize } from '@kbn/core-base-common/src/transferable';
import { CoreContext } from '@kbn/core-base-server-internal/src/core_context';
import { ElasticsearchService } from '@kbn/core-elasticsearch-server-internal/src/elasticsearch_service';
import { ExecutionContextService } from '@kbn/core-execution-context-server-internal/src/execution_context_service';
import { ContextService } from '@kbn/core-http-context-server-internal/src/context_service';
import { HttpService } from '@kbn/core-http-server-internal/src/http_service';
import type { LoggingConfigType } from '@kbn/core-logging-server-internal/src/logging_config';
import { LoggingSystem } from '@kbn/core-logging-server-internal/src/logging_system';
import { isPrimitive } from 'utility-types';
import isArray from 'lodash/isArray';
import { firstValueFrom } from 'rxjs';
import type { InternalWorkerData, TransferableWorkerService, WorkerService } from './types';
import { isPlainObject, isTransferableState } from './utils';
import { TRANSFERABLE_OBJECT_KEY } from './constants';

function getDeserializer(ctorMap: Record<TransferableWorkerService, TransferableConstructor<any>>) {
  return function deserialize(obj: unknown): unknown {
    if (isPrimitive(obj)) {
      return obj;
    }

    if (isArray(obj)) {
      return obj.map((val) => deserialize(val));
    }

    if (isTransferableState(obj)) {
      const state = obj[TRANSFERABLE_OBJECT_KEY];
      return ctorMap[state.constructor][kDeserialize](deserialize(state.value));
    }

    if (isPlainObject(obj)) {
      const result: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        result[key] = deserialize(val);
      }
      return result;
    }
    return obj;
  };
}

export async function initialize({ services }: InternalWorkerData) {
  const loggingSystem = new LoggingSystem();
  const loggerFactory = loggingSystem.get('worker');

  class Logger {
    static [kDeserialize]({ context }: { context: string }) {
      return loggerFactory.get(context);
    }
  }

  const ctorMap = {
    ConfigService,
    Env,
    Logger,
  } satisfies Record<TransferableWorkerService, TransferableConstructor<any>>;

  const deserialize = getDeserializer(ctorMap);

  const deserializedServices = deserialize(services) as Record<WorkerService, any>;

  const workerCoreId = Symbol('core');

  const configService: ConfigService = deserializedServices.ConfigService;

  configService.setGlobalStripUnknownKeys(true);

  registerServiceConfig(configService);

  const coreContext: CoreContext = {
    configService,
    env: deserializedServices.Env,
    coreId: workerCoreId,
    logger: loggerFactory,
  };

  const analytics = new AnalyticsService(coreContext);
  const context = new ContextService(coreContext);
  const executionContext = new ExecutionContextService(coreContext);
  const http = new HttpService(coreContext);
  const elasticsearch = new ElasticsearchService(coreContext);

  const pluginDependencies = new Map();

  const analyticsSetup = analytics.setup();

  const contextSetup = context.setup({
    pluginDependencies,
  });

  const executionContextSetup = executionContext.setup();

  const httpSetup = await http.setup({
    context: contextSetup,
    executionContext: executionContextSetup,
  });

  await elasticsearch.setup({
    analytics: analyticsSetup,
    executionContext: executionContextSetup,
    http: httpSetup,
  });

  const elasticsearchStart = await elasticsearch.start();

  const config = await firstValueFrom(configService.atPath<LoggingConfigType>('logging'));

  await loggingSystem.upgrade(config);

  return {
    elasticsearch: elasticsearchStart,
    logger: loggerFactory,
  };
}
