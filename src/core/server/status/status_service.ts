/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable, combineLatest, Subscription } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, take, debounceTime } from 'rxjs/operators';
import { isDeepStrictEqual } from 'util';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { InternalElasticsearchServiceSetup } from '../elasticsearch';
import { InternalHttpServiceSetup } from '../http';
import { InternalSavedObjectsServiceSetup } from '../saved_objects';
import { PluginName } from '../plugins';
import { InternalMetricsServiceSetup } from '../metrics';
import { registerStatusRoute } from './routes';
import { InternalEnvironmentServiceSetup } from '../environment';

import { config, StatusConfigType } from './status_config';
import { ServiceStatus, CoreStatus, InternalStatusServiceSetup } from './types';
import { getSummaryStatus } from './get_summary_status';
import { PluginsStatusService } from './plugins_status';

interface SetupDeps {
  elasticsearch: Pick<InternalElasticsearchServiceSetup, 'status$'>;
  environment: InternalEnvironmentServiceSetup;
  pluginDependencies: ReadonlyMap<PluginName, PluginName[]>;
  http: InternalHttpServiceSetup;
  metrics: InternalMetricsServiceSetup;
  savedObjects: Pick<InternalSavedObjectsServiceSetup, 'status$'>;
}

export class StatusService implements CoreService<InternalStatusServiceSetup> {
  private readonly logger: Logger;
  private readonly config$: Observable<StatusConfigType>;

  private pluginsStatus?: PluginsStatusService;
  private overallSubscription?: Subscription;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('status');
    this.config$ = coreContext.configService.atPath<StatusConfigType>(config.path);
  }

  public async setup({
    elasticsearch,
    pluginDependencies,
    http,
    metrics,
    savedObjects,
    environment,
  }: SetupDeps) {
    const statusConfig = await this.config$.pipe(take(1)).toPromise();
    const core$ = this.setupCoreStatus({ elasticsearch, savedObjects });
    this.pluginsStatus = new PluginsStatusService({ core$, pluginDependencies });

    const overall$: Observable<ServiceStatus> = combineLatest([
      core$,
      this.pluginsStatus.getAll$(),
    ]).pipe(
      // Prevent many emissions at once from dependency status resolution from making this too noisy
      debounceTime(500),
      map(([coreStatus, pluginsStatus]) => {
        const summary = getSummaryStatus([
          ...Object.entries(coreStatus),
          ...Object.entries(pluginsStatus),
        ]);
        this.logger.debug(`Recalculated overall status`, { status: summary });
        return summary;
      }),
      distinctUntilChanged(isDeepStrictEqual),
      shareReplay(1)
    );

    // Create an unused subscription to ensure all underlying lazy observables are started.
    this.overallSubscription = overall$.subscribe();

    const router = http.createRouter('');
    registerStatusRoute({
      router,
      config: {
        allowAnonymous: statusConfig.allowAnonymous,
        packageInfo: this.coreContext.env.packageInfo,
        serverName: http.getServerInfo().name,
        uuid: environment.instanceUuid,
      },
      metrics,
      status: {
        overall$,
        plugins$: this.pluginsStatus.getAll$(),
        core$,
      },
    });

    return {
      core$,
      overall$,
      plugins: {
        set: this.pluginsStatus.set.bind(this.pluginsStatus),
        getDependenciesStatus$: this.pluginsStatus.getDependenciesStatus$.bind(this.pluginsStatus),
        getDerivedStatus$: this.pluginsStatus.getDerivedStatus$.bind(this.pluginsStatus),
      },
      isStatusPageAnonymous: () => statusConfig.allowAnonymous,
    };
  }

  public start() {}

  public stop() {
    if (this.overallSubscription) {
      this.overallSubscription.unsubscribe();
      this.overallSubscription = undefined;
    }
  }

  private setupCoreStatus({
    elasticsearch,
    savedObjects,
  }: Pick<SetupDeps, 'elasticsearch' | 'savedObjects'>): Observable<CoreStatus> {
    return combineLatest([elasticsearch.status$, savedObjects.status$]).pipe(
      map(([elasticsearchStatus, savedObjectsStatus]) => ({
        elasticsearch: elasticsearchStatus,
        savedObjects: savedObjectsStatus,
      })),
      distinctUntilChanged(isDeepStrictEqual),
      shareReplay(1)
    );
  }
}
