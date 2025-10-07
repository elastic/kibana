/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  CoreStart,
} from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { ReplaySubject, takeUntil, type Subject, type Subscription } from 'rxjs';
import { routeRepository } from './routes';
import type { ESQLSetup } from './lib/esql_extensions/set_esql_recommended_queries';
import { setEsqlRecommendedQueries } from './lib/esql_extensions/set_esql_recommended_queries';
import { METRICS_EXPERIENCE_FEATURE_FLAG_KEY } from '../common/constants';

export type MetricsExperiencePluginSetup = ReturnType<MetricsExperiencePlugin['setup']>;
export type MetricsExperiencePluginStart = ReturnType<MetricsExperiencePlugin['start']>;

interface PluginSetup {
  esql: ESQLSetup;
}

export class MetricsExperiencePlugin
  implements Plugin<MetricsExperiencePluginSetup, MetricsExperiencePluginStart, PluginSetup>
{
  public logger: Logger;
  private metricExperienceEnabled$?: Subscription;
  private pluginStop$: Subject<void>;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.pluginStop$ = new ReplaySubject(1);
  }

  public setup(core: CoreSetup, plugins: PluginSetup) {
    void core.getStartServices().then(([coreStart]) => {
      registerRoutes({
        core,
        logger: this.logger,
        repository: routeRepository,
        dependencies: {
          pluginsSetup: {
            ...plugins,
            core,
          },
        },
        runDevModeChecks: true,
      });

      this.metricExperienceEnabled$ = coreStart.featureFlags
        .getBooleanValue$(METRICS_EXPERIENCE_FEATURE_FLAG_KEY, false)
        .pipe(takeUntil(this.pluginStop$))
        .subscribe((isMetricsExperienceEnabled) => {
          if (isMetricsExperienceEnabled) {
            setEsqlRecommendedQueries(plugins.esql);
          }
        });
    });
  }

  public start(_core: CoreStart) {}

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();

    if (this.metricExperienceEnabled$ !== undefined) {
      this.metricExperienceEnabled$.unsubscribe();
    }
  }
}
