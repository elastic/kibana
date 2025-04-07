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
import { TransferableConstructor, kDeserialize } from '@kbn/core-base-common/src/transferable';
import { CoreContext } from '@kbn/core-base-server-internal/src/core_context';
import type { LoggingConfigType } from '@kbn/core-logging-server-internal/src/logging_config';
import { LoggingSystem } from '@kbn/core-logging-server-internal/src/logging_system';
import { registerServiceConfig } from '@kbn/core-root-server-internal/src/register_service_config';
import isArray from 'lodash/isArray';
import {
  Observable,
  defer,
  firstValueFrom,
  forkJoin,
  from,
  lastValueFrom,
  map,
  shareReplay,
  switchMap,
} from 'rxjs';
import { isPrimitive } from 'utility-types';
import { InternalSavedObjectsServiceStart } from '@kbn/core-saved-objects-server-internal';
import { TRANSFERABLE_OBJECT_KEY } from './constants';
import type { InternalWorkerData, TransferableWorkerService, WorkerService } from './types';
import { isPlainObject, isTransferableState } from './utils';

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

  const analytics$ = defer(() => {
    return from(
      import('@kbn/core-analytics-server-internal/src/analytics_service').then(
        (m) => new m.AnalyticsService(coreContext)
      )
    );
  });

  const context$ = defer(() => {
    return from(
      import('@kbn/core-http-context-server-internal').then(
        (m) => new m.ContextService(coreContext)
      )
    );
  });

  const executionContext$ = defer(() => {
    return from(
      import('@kbn/core-execution-context-server-internal').then(
        (m) => new m.ExecutionContextService(coreContext)
      )
    );
  });

  const http$ = defer(() => {
    return from(
      import('@kbn/core-http-server-internal').then((m) => new m.HttpService(coreContext))
    );
  });

  const elasticsearch$ = defer(() => {
    return from(
      import('@kbn/core-elasticsearch-server-internal').then(
        (m) => new m.ElasticsearchService(coreContext)
      )
    );
  });

  const coreUsageData$ = defer(() => {
    return from(
      import('@kbn/core-usage-data-server-internal').then(
        (m) => new m.CoreUsageDataService(coreContext)
      )
    );
  });

  const docLinks$ = defer(() => {
    return from(
      import('@kbn/core-doc-links-server-internal').then((m) => new m.DocLinksService(coreContext))
    );
  });

  const deprecations$ = defer(() => {
    return from(
      import('@kbn/core-deprecations-server-internal').then(
        (m) => new m.DeprecationsService(coreContext)
      )
    );
  });

  const logging$ = defer(() => {
    return from(
      import('@kbn/core-logging-server-internal').then((m) => new m.LoggingService(coreContext))
    );
  });

  const metrics$ = defer(() => {
    return from(
      import('@kbn/core-metrics-server-internal').then((m) => new m.MetricsService(coreContext))
    );
  });

  const node$ = defer(() => {
    return from(
      import('@kbn/core-node-server-internal').then((m) => new m.NodeService(coreContext))
    );
  });

  const savedObjects$ = defer(() => {
    return from(
      import('@kbn/core-saved-objects-server-internal').then(
        (m) => new m.SavedObjectsService(coreContext)
      )
    );
  });

  const uiSettings$ = defer(() => {
    return from(
      import('@kbn/core-ui-settings-server-internal').then(
        (m) => new m.UiSettingsService(coreContext)
      )
    );
  });

  const pluginDependencies = new Map();

  const contextSetup$ = context$.pipe(
    map((contextService) => contextService.setup({ pluginDependencies }))
  );

  const executionContextSetup$ = executionContext$.pipe(
    map((executionContextService) => executionContextService.setup())
  );

  const analyticsSetup$ = analytics$.pipe(map((analytics) => analytics.setup()));

  const httpSetup$ = forkJoin([http$, contextSetup$, executionContextSetup$]).pipe(
    switchMap(([http, context, executionContext]) => {
      return from(
        http.setup({
          context,
          executionContext,
        })
      );
    })
  );

  const elasticsearchSetup$ = forkJoin([
    elasticsearch$,
    analyticsSetup$,
    executionContextSetup$,
    httpSetup$,
  ]).pipe(
    switchMap(([elasticsearch, analytics, executionContext, http]) => {
      return from(
        elasticsearch.setup({
          analytics,
          executionContext,
          http,
        })
      );
    })
  );

  const docLinksSetup$ = docLinks$.pipe(map((docLinks) => docLinks.setup()));

  const metricsSetup$ = metrics$.pipe(switchMap((metrics) => from(metrics.start())));

  const coreUsageDataSetup$ = forkJoin([coreUsageData$, metricsSetup$, httpSetup$]).pipe(
    map(([coreUsageData, metrics, http]) =>
      coreUsageData.setup({
        metrics,
        http,
        savedObjectsStartPromise: lastValueFrom(savedObjectsStart$),
        changedDeprecatedConfigPath$: configService.getDeprecatedConfigPath$(),
      })
    )
  );

  const loggingSetup$ = logging$.pipe(map((logging) => logging.setup()));

  const deprecationsSetup$ = forkJoin([
    deprecations$,
    coreUsageDataSetup$,
    docLinksSetup$,
    httpSetup$,
    loggingSetup$,
  ]).pipe(
    switchMap(([deprecations, coreUsageData, docLinks, http, logging]) =>
      from(
        deprecations.setup({
          coreUsageData,
          docLinks,
          http,
          logging,
        })
      )
    )
  );

  const savedObjectsSetup$ = forkJoin([
    savedObjects$,
    elasticsearchSetup$,
    coreUsageDataSetup$,
    deprecationsSetup$,
    docLinksSetup$,
    httpSetup$,
  ]).pipe(
    switchMap(([savedObjects, elasticsearch, coreUsageData, deprecations, docLinks, http]) => {
      return from(
        savedObjects.setup({
          elasticsearch,
          coreUsageData,
          deprecations,
          docLinks,
          http,
        })
      );
    })
  );

  const uiSettingsSetup$ = forkJoin([uiSettings$, httpSetup$, savedObjectsSetup$]).pipe(
    switchMap(([uiSettings, http, savedObjects]) => {
      return from(
        uiSettings.setup({
          http,
          savedObjects,
        })
      );
    })
  );

  const elasticsearchStart$ = forkJoin([elasticsearch$, elasticsearchSetup$]).pipe(
    switchMap(([elasticsearch]) => {
      return from(elasticsearch.start());
    })
  );

  const nodeStart$ = node$.pipe(map((node) => node.start()));

  const docLinksStart$ = docLinks$.pipe(map((docLinks) => docLinks.start()));

  const savedObjectsStart$: Observable<InternalSavedObjectsServiceStart> = forkJoin([
    savedObjects$,
    docLinksStart$,
    elasticsearchStart$,
    nodeStart$,
    savedObjectsSetup$,
  ]).pipe(
    switchMap(([savedObjects, docLinks, elasticsearch, node]) => {
      return from(
        savedObjects.start({
          docLinks,
          elasticsearch,
          node,
          pluginsInitialized: false,
        })
      );
    })
  );

  const uiSettingsStart$ = forkJoin([uiSettings$, uiSettingsSetup$]).pipe(
    switchMap(([uiSettings]) => {
      return from(uiSettings.start());
    })
  );

  const config = await firstValueFrom(configService.atPath<LoggingConfigType>('logging'));

  await loggingSystem.upgrade(config);

  const logger = loggerFactory.get('worker-root');

  logger.info(`Worker started`);

  return {
    elasticsearch: {
      start$: elasticsearchStart$.pipe(shareReplay(1)),
      setup$: elasticsearchSetup$.pipe(shareReplay(1)),
    },
    savedObjects: {
      start$: savedObjectsStart$.pipe(shareReplay(1)),
      setup$: savedObjectsSetup$.pipe(shareReplay(1)),
    },
    uiSettings: {
      start$: uiSettingsStart$.pipe(shareReplay(1)),
      setup$: savedObjectsSetup$.pipe(shareReplay(1)),
    },
    logger: loggerFactory,
  };
}
