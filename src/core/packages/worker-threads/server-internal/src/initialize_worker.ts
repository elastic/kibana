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
  }).pipe(shareReplay(1));

  const context$ = defer(() => {
    return from(
      import('@kbn/core-http-context-server-internal').then(
        (m) => new m.ContextService(coreContext)
      )
    );
  }).pipe(shareReplay(1));

  const executionContext$ = defer(() => {
    return from(
      import('@kbn/core-execution-context-server-internal').then(
        (m) => new m.ExecutionContextService(coreContext)
      )
    );
  }).pipe(shareReplay(1));

  const http$ = defer(() => {
    return from(
      import('@kbn/core-http-server-internal').then((m) => new m.HttpService(coreContext))
    );
  }).pipe(shareReplay(1));

  const elasticsearch$ = defer(() => {
    return from(
      import('@kbn/core-elasticsearch-server-internal').then(
        (m) => new m.ElasticsearchService(coreContext)
      )
    );
  }).pipe(shareReplay(1));

  const coreUsageData$ = defer(() => {
    return from(
      import('@kbn/core-usage-data-server-internal').then(
        (m) => new m.CoreUsageDataService(coreContext)
      )
    );
  }).pipe(shareReplay(1));

  const docLinks$ = defer(() => {
    return from(
      import('@kbn/core-doc-links-server-internal').then((m) => new m.DocLinksService(coreContext))
    );
  }).pipe(shareReplay(1));

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
  }).pipe(shareReplay(1));

  const metrics$ = defer(() => {
    return from(
      import('@kbn/core-metrics-server-internal').then((m) => new m.MetricsService(coreContext))
    );
  }).pipe(shareReplay(1));

  const node$ = defer(() => {
    return from(
      import('@kbn/core-node-server-internal').then((m) => new m.NodeService(coreContext))
    );
  }).pipe(shareReplay(1));

  const savedObjects$ = defer(() => {
    return from(
      import('@kbn/core-saved-objects-server-internal').then(
        (m) => new m.SavedObjectsService(coreContext)
      )
    );
  }).pipe(shareReplay(1));

  const uiSettings$ = defer(() => {
    return from(
      import('@kbn/core-ui-settings-server-internal').then(
        (m) => new m.UiSettingsService(coreContext)
      )
    );
  }).pipe(shareReplay(1));

  const pluginDependencies = new Map();

  const contextSetup$ = context$.pipe(
    map((context) => {
      return context.setup({ pluginDependencies });
    }),
    shareReplay(1)
  );

  const executionContextSetup$ = executionContext$.pipe(
    map((executionContext) => executionContext.setup()),
    shareReplay(1)
  );

  const analyticsSetup$ = analytics$.pipe(
    map((analytics) => {
      return analytics.setup();
    }),
    shareReplay(1)
  );

  const httpSetup$ = forkJoin([http$, contextSetup$, executionContextSetup$])
    .pipe(
      switchMap(async ([http, context, executionContext]) => {
        return http.setup({
          context,
          executionContext,
        });
      })
    )
    .pipe(shareReplay(1));

  const elasticsearchSetup$ = forkJoin([
    elasticsearch$,
    analyticsSetup$,
    executionContextSetup$,
    httpSetup$,
  ])
    .pipe(
      switchMap(([elasticsearch, analytics, executionContext, http]) => {
        return elasticsearch.setup({
          analytics,
          executionContext,
          http,
        });
      })
    )
    .pipe(shareReplay(1));

  const docLinksSetup$ = docLinks$.pipe(map((docLinks) => docLinks.setup())).pipe(shareReplay(1));

  const metricsSetup$ = forkJoin([metrics$, elasticsearchSetup$, httpSetup$])
    .pipe(
      switchMap(([metrics, elasticsearchService, http]) =>
        metrics.setup({
          elasticsearchService,
          http,
        })
      )
    )
    .pipe(shareReplay(1));

  const coreUsageDataSetup$ = forkJoin([coreUsageData$, metricsSetup$, httpSetup$])
    .pipe(
      map(([coreUsageData, metrics, http]) =>
        coreUsageData.setup({
          metrics,
          http,
          savedObjectsStartPromise: lastValueFrom(savedObjectsStart$),
          changedDeprecatedConfigPath$: configService.getDeprecatedConfigPath$(),
        })
      )
    )
    .pipe(shareReplay(1));

  const loggingSetup$ = logging$
    .pipe(
      switchMap(async (logging) => {
        await logging.preboot({ loggingSystem });
        return logging.setup();
      })
    )
    .pipe(shareReplay(1));

  const deprecationsSetup$ = forkJoin([
    deprecations$,
    coreUsageDataSetup$,
    docLinksSetup$,
    httpSetup$,
    loggingSetup$,
  ])
    .pipe(
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
    )
    .pipe(shareReplay(1));

  const savedObjectsSetup$ = forkJoin([
    savedObjects$,
    elasticsearchSetup$,
    coreUsageDataSetup$,
    deprecationsSetup$,
    docLinksSetup$,
    httpSetup$,
  ])
    .pipe(
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
    )
    .pipe(shareReplay(1));

  const uiSettingsSetup$ = forkJoin([uiSettings$, httpSetup$, savedObjectsSetup$])
    .pipe(
      switchMap(([uiSettings, http, savedObjects]) => {
        return from(
          uiSettings.setup({
            http,
            savedObjects,
          })
        );
      })
    )
    .pipe(shareReplay(1));

  const elasticsearchStart$ = forkJoin([elasticsearch$, elasticsearchSetup$])
    .pipe(
      switchMap(([elasticsearch]) => {
        return from(elasticsearch.start());
      })
    )
    .pipe(shareReplay(1));

  const docLinksStart$ = forkJoin([docLinks$, docLinksSetup$])
    .pipe(map(([docLinks]) => docLinks.start()))
    .pipe(shareReplay(1));
  const nodeStart$ = node$.pipe(
    switchMap(async (node) => {
      await node.preboot({
        loggingSystem,
      });
      return node.start();
    }),
    shareReplay(1)
  );

  const savedObjectsStart$: Observable<InternalSavedObjectsServiceStart> = forkJoin([
    savedObjects$,
    docLinksStart$,
    elasticsearchStart$,
    nodeStart$,
    savedObjectsSetup$,
  ])
    .pipe(
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
    )
    .pipe(shareReplay(1));

  const uiSettingsStart$ = forkJoin([uiSettings$, uiSettingsSetup$])
    .pipe(
      switchMap(([uiSettings]) => {
        return from(uiSettings.start());
      })
    )
    .pipe(shareReplay(1));

  const config = await firstValueFrom(configService.atPath<LoggingConfigType>('logging'));

  await loggingSystem.upgrade(config);

  const logger = loggerFactory.get('worker-root');

  logger.info(`Worker started`);

  return {
    elasticsearch: {
      start$: elasticsearchStart$,
      setup$: elasticsearchSetup$,
    },
    savedObjects: {
      start$: savedObjectsStart$,
      setup$: savedObjectsSetup$,
    },
    uiSettings: {
      start$: uiSettingsStart$,
      setup$: savedObjectsSetup$,
    },
    logger: loggerFactory,
  };
}
