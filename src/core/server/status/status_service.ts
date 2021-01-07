/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
