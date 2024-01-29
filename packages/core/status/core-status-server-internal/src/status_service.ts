/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  type Observable,
  combineLatest,
  type Subscription,
  Subject,
  firstValueFrom,
  tap,
  BehaviorSubject,
} from 'rxjs';
import { map, distinctUntilChanged, shareReplay, takeUntil, debounceTime } from 'rxjs/operators';
import { isDeepStrictEqual } from 'util';

import type { RootSchema } from '@kbn/analytics-client';
import type { Logger, LogMeta } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { PluginName } from '@kbn/core-base-common';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { InternalEnvironmentServiceSetup } from '@kbn/core-environment-server-internal';
import type {
  InternalHttpServiceSetup,
  InternalHttpServicePreboot,
} from '@kbn/core-http-server-internal';
import type { InternalElasticsearchServiceSetup } from '@kbn/core-elasticsearch-server-internal';
import type { InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';
import type { InternalSavedObjectsServiceSetup } from '@kbn/core-saved-objects-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { type ServiceStatus, type CoreStatus } from '@kbn/core-status-common';
import { registerStatusRoute, registerPrebootStatusRoute } from './routes';

import { statusConfig as config, type StatusConfigType } from './status_config';
import type { InternalStatusServiceSetup } from './types';
import { getSummaryStatus } from './get_summary_status';
import { PluginsStatusService } from './cached_plugins_status';
import { logCoreStatusChanges } from './log_core_services_status';
import { logPluginsStatusChanges } from './log_plugins_status';
import { logOverallStatusChanges } from './log_overall_status';

interface StatusLogMeta extends LogMeta {
  kibana: { status: ServiceStatus };
}

interface StatusAnalyticsPayload {
  overall_status_level: string;
  overall_status_summary: string;
}

export interface StatusServicePrebootDeps {
  http: InternalHttpServicePreboot;
}

export interface StatusServiceSetupDeps {
  analytics: AnalyticsServiceSetup;
  elasticsearch: Pick<InternalElasticsearchServiceSetup, 'status$'>;
  environment: InternalEnvironmentServiceSetup;
  pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
  http: InternalHttpServiceSetup;
  metrics: InternalMetricsServiceSetup;
  savedObjects: Pick<InternalSavedObjectsServiceSetup, 'status$'>;
  coreUsageData: Pick<InternalCoreUsageDataSetup, 'incrementUsageCounter'>;
}

export class StatusService implements CoreService<InternalStatusServiceSetup> {
  private readonly logger: Logger;
  private readonly config$: Observable<StatusConfigType>;
  private readonly stop$ = new Subject<void>();

  private core$?: Observable<CoreStatus>;
  private overall$?: Observable<ServiceStatus>;
  private pluginsStatus?: PluginsStatusService;
  private subscriptions: Subscription[] = [];

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('status');
    this.config$ = coreContext.configService.atPath<StatusConfigType>(config.path);
  }

  public async preboot({ http }: StatusServicePrebootDeps) {
    http.registerRoutes('', (router) => {
      registerPrebootStatusRoute({ router });
    });
  }

  public async setup({
    analytics,
    elasticsearch,
    pluginDependencies,
    http,
    metrics,
    savedObjects,
    environment,
    coreUsageData,
  }: StatusServiceSetupDeps) {
    const statusConfig = await firstValueFrom(this.config$);
    const core$ = (this.core$ = this.setupCoreStatus({ elasticsearch, savedObjects }));
    this.pluginsStatus = new PluginsStatusService({ core$, pluginDependencies });

    this.overall$ = combineLatest([core$, this.pluginsStatus.getAll$()]).pipe(
      // Prevent many emissions at once from dependency status resolution from making this too noisy
      debounceTime(80),
      map(([serviceStatuses, pluginStatuses]) => {
        const summary = getSummaryStatus({ serviceStatuses, pluginStatuses });
        this.logger.debug<StatusLogMeta>(`Recalculated overall status`, {
          kibana: {
            status: summary,
          },
        });
        return summary;
      }),
      distinctUntilChanged<ServiceStatus<unknown>>(isDeepStrictEqual),
      shareReplay(1)
    );

    this.setupAnalyticsContextAndEvents(analytics);

    const coreOverall$ = core$.pipe(
      // Prevent many emissions at once from dependency status resolution from making this too noisy
      debounceTime(25),
      map((serviceStatuses) => {
        const coreOverall = getSummaryStatus({ serviceStatuses });
        this.logger.debug<StatusLogMeta>(`Recalculated core overall status`, {
          kibana: {
            status: coreOverall,
          },
        });
        return coreOverall;
      }),
      distinctUntilChanged<ServiceStatus<unknown>>(isDeepStrictEqual),
      shareReplay(1)
    );

    // Create unused subscriptions to ensure all underlying lazy observables are started.
    this.subscriptions.push(this.overall$.subscribe(), coreOverall$.subscribe());

    const commonRouteDeps = {
      config: {
        allowAnonymous: statusConfig.allowAnonymous,
        packageInfo: this.coreContext.env.packageInfo,
        serverName: http.getServerInfo().name,
        uuid: environment.instanceUuid,
      },
      metrics,
      status: {
        overall$: this.overall$,
        plugins$: this.pluginsStatus.getAll$(),
        core$,
        coreOverall$,
      },
      incrementUsageCounter: coreUsageData.incrementUsageCounter,
    };

    const router = http.createRouter('');
    registerStatusRoute({
      router,
      ...commonRouteDeps,
    });

    return {
      core$,
      coreOverall$,
      overall$: this.overall$,
      plugins: {
        set: this.pluginsStatus.set.bind(this.pluginsStatus),
        getDependenciesStatus$: this.pluginsStatus.getDependenciesStatus$.bind(this.pluginsStatus),
        getDerivedStatus$: this.pluginsStatus.getDerivedStatus$.bind(this.pluginsStatus),
      },
      isStatusPageAnonymous: () => statusConfig.allowAnonymous,
    };
  }

  public start() {
    if (!this.pluginsStatus || !this.overall$) {
      throw new Error(`StatusService#setup must be called before #start`);
    }
    this.pluginsStatus.start();
    this.logStatusChanges();
  }

  public stop() {
    this.stop$.next();
    this.stop$.complete();

    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });

    this.pluginsStatus?.stop();
    this.subscriptions = [];
  }

  private setupCoreStatus({
    elasticsearch,
    savedObjects,
  }: Pick<StatusServiceSetupDeps, 'elasticsearch' | 'savedObjects'>): Observable<CoreStatus> {
    return combineLatest([elasticsearch.status$, savedObjects.status$]).pipe(
      map(([elasticsearchStatus, savedObjectsStatus]) => ({
        elasticsearch: elasticsearchStatus,
        savedObjects: savedObjectsStatus,
      })),
      distinctUntilChanged<CoreStatus>(isDeepStrictEqual),
      shareReplay(1)
    );
  }

  private setupAnalyticsContextAndEvents(analytics: AnalyticsServiceSetup) {
    // Set an initial "initializing" status, so we can attach it to early events.
    const context$ = new BehaviorSubject<StatusAnalyticsPayload>({
      overall_status_level: 'initializing',
      overall_status_summary: 'Kibana is starting up',
    });

    // The schema is the same for the context and the events.
    const schema: RootSchema<StatusAnalyticsPayload> = {
      overall_status_level: {
        type: 'keyword',
        _meta: { description: 'The current availability level of the service.' },
      },
      overall_status_summary: {
        type: 'text',
        _meta: { description: 'A high-level summary of the service status.' },
      },
    };

    const overallStatusChangedEventName = 'core-overall_status_changed';

    analytics.registerEventType({ eventType: overallStatusChangedEventName, schema });
    analytics.registerContextProvider({ name: 'status info', context$, schema });

    this.overall$!.pipe(
      takeUntil(this.stop$),
      map(({ level, summary }) => ({
        overall_status_level: level.toString(),
        overall_status_summary: summary,
      })),
      // Emit the event before spreading the status to the context.
      // This way we see from the context the previous status and the current one.
      tap((statusPayload) => analytics.reportEvent(overallStatusChangedEventName, statusPayload))
    ).subscribe(context$);
  }

  private logStatusChanges() {
    logCoreStatusChanges({
      logger: this.logger.get('core'),
      core$: this.core$!,
      stop$: this.stop$,
    });

    logPluginsStatusChanges({
      logger: this.logger.get('plugins'),
      plugins$: this.pluginsStatus!.getAll$(),
      stop$: this.stop$,
    });

    logOverallStatusChanges({
      logger: this.logger,
      overall$: this.overall$!,
      stop$: this.stop$,
    });
  }
}
