/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  StartServicesAccessor,
} from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import React from 'react';
import moment from 'moment';
import { BfetchPublicSetup } from '@kbn/bfetch-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import type { ISearchSetup, ISearchStart } from './types';

import { handleResponse } from './fetch';
import {
  cidrFunction,
  dateRangeFunction,
  esRawResponse,
  existsFilterFunction,
  extendedBoundsFunction,
  fieldFunction,
  geoBoundingBoxFunction,
  geoPointFunction,
  ipRangeFunction,
  ISearchGeneric,
  kibana,
  kibanaContext,
  kibanaFilterFunction,
  kibanaTimerangeFunction,
  kqlFunction,
  luceneFunction,
  numericalRangeFunction,
  phraseFilterFunction,
  queryFilterFunction,
  rangeFilterFunction,
  rangeFunction,
  removeFilterFunction,
  SearchSourceDependencies,
  SearchSourceService,
  selectFilterFunction,
  eqlRawResponse,
} from '../../common/search';
import { AggsService, AggsStartDependencies } from './aggs';
import { IKibanaSearchResponse, IndexPatternsContract, SearchRequest } from '..';
import { ISearchInterceptor, SearchInterceptor } from './search_interceptor';
import { createUsageCollector, SearchUsageCollector } from './collectors';
import { getEsaggs, getEsdsl, getEql } from './expressions';
import { ISessionsClient, ISessionService, SessionsClient, SessionService } from './session';
import { ConfigSchema } from '../../config';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { DataPublicPluginStart, DataStartDependencies } from '../types';
import { NowProviderInternalContract } from '../now_provider';
import { getKibanaContext } from './expressions/kibana_context';
import { createConnectedSearchSessionIndicator } from './session/session_indicator';

import { registerSearchSessionsMgmt } from './session/sessions_mgmt';

/** @internal */
export interface SearchServiceSetupDependencies {
  bfetch: BfetchPublicSetup;
  expressions: ExpressionsSetup;
  usageCollection?: UsageCollectionSetup;
  nowProvider: NowProviderInternalContract;
  management: ManagementSetup;
}

/** @internal */
export interface SearchServiceStartDependencies {
  fieldFormats: AggsStartDependencies['fieldFormats'];
  indexPatterns: IndexPatternsContract;
  screenshotMode: ScreenshotModePluginStart;
}

export class SearchService implements Plugin<ISearchSetup, ISearchStart> {
  private readonly aggsService = new AggsService();
  private readonly searchSourceService = new SearchSourceService();
  private searchInterceptor!: ISearchInterceptor;
  private usageCollector?: SearchUsageCollector;
  private sessionService!: ISessionService;
  private sessionsClient!: ISessionsClient;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    core: CoreSetup,
    {
      bfetch,
      expressions,
      usageCollection,
      nowProvider,
      management,
    }: SearchServiceSetupDependencies
  ): ISearchSetup {
    const { http, getStartServices, notifications, uiSettings, executionContext, theme } = core;
    this.usageCollector = createUsageCollector(getStartServices, usageCollection);

    this.sessionsClient = new SessionsClient({ http });
    this.sessionService = new SessionService(
      this.initializerContext,
      getStartServices,
      this.sessionsClient,
      nowProvider
    );
    /**
     * A global object that intercepts all searches and provides convenience methods for cancelling
     * all pending search requests, as well as getting the number of pending search requests.
     */
    this.searchInterceptor = new SearchInterceptor({
      bfetch,
      toasts: notifications.toasts,
      executionContext,
      http,
      uiSettings,
      startServices: getStartServices(),
      usageCollector: this.usageCollector!,
      session: this.sessionService,
      theme,
    });

    expressions.registerFunction(
      getEsaggs({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(kibana);
    expressions.registerFunction(
      getKibanaContext({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(cidrFunction);
    expressions.registerFunction(dateRangeFunction);
    expressions.registerFunction(extendedBoundsFunction);
    expressions.registerFunction(ipRangeFunction);
    expressions.registerFunction(luceneFunction);
    expressions.registerFunction(kqlFunction);
    expressions.registerFunction(kibanaTimerangeFunction);
    expressions.registerFunction(fieldFunction);
    expressions.registerFunction(numericalRangeFunction);
    expressions.registerFunction(geoBoundingBoxFunction);
    expressions.registerFunction(geoPointFunction);
    expressions.registerFunction(rangeFunction);
    expressions.registerFunction(kibanaFilterFunction);
    expressions.registerFunction(existsFilterFunction);
    expressions.registerFunction(queryFilterFunction);
    expressions.registerFunction(rangeFilterFunction);
    expressions.registerFunction(removeFilterFunction);
    expressions.registerFunction(selectFilterFunction);
    expressions.registerFunction(phraseFilterFunction);
    expressions.registerType(kibanaContext);

    expressions.registerFunction(
      getEsdsl({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(
      getEql({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerType(esRawResponse);
    expressions.registerType(eqlRawResponse);

    const aggs = this.aggsService.setup({
      registerFunction: expressions.registerFunction,
      uiSettings,
      nowProvider,
    });

    if (this.initializerContext.config.get().search.aggs.shardDelay.enabled) {
      aggs.types.registerBucket(SHARD_DELAY_AGG_NAME, getShardDelayBucketAgg);
      expressions.registerFunction(aggShardDelay);
    }

    const config = this.initializerContext.config.get<ConfigSchema>();
    if (config.search.sessions.enabled) {
      const sessionsConfig = config.search.sessions;
      registerSearchSessionsMgmt(
        core as CoreSetup<DataStartDependencies>,
        {
          searchUsageCollector: this.usageCollector!,
          sessionsClient: this.sessionsClient,
          management,
        },
        sessionsConfig,
        this.initializerContext.env.packageInfo.version
      );
    }

    return {
      aggs,
      usageCollector: this.usageCollector!,
      session: this.sessionService,
      sessionsClient: this.sessionsClient,
    };
  }

  public start(
    { http, theme, uiSettings, chrome, application }: CoreStart,
    { fieldFormats, indexPatterns, screenshotMode }: SearchServiceStartDependencies
  ): ISearchStart {
    const search = ((request, options = {}) => {
      return this.searchInterceptor.search(request, options);
    }) as ISearchGeneric;

    const loadingCount$ = new BehaviorSubject(0);
    http.addLoadingCountSource(loadingCount$);

    const searchSourceDependencies: SearchSourceDependencies = {
      getConfig: uiSettings.get.bind(uiSettings),
      search,
      onResponse: (request: SearchRequest, response: IKibanaSearchResponse) =>
        handleResponse(request, response, theme),
    };

    const config = this.initializerContext.config.get();
    if (config.search.sessions.enabled) {
      chrome.setBreadcrumbsAppendExtension({
        content: toMountPoint(
          React.createElement(
            createConnectedSearchSessionIndicator({
              sessionService: this.sessionService,
              application,
              basePath: http.basePath,
              storage: new Storage(window.localStorage),
              disableSaveAfterSessionCompletesTimeout: moment
                .duration(config.search.sessions.notTouchedTimeout)
                .asMilliseconds(),
              usageCollector: this.usageCollector,
              tourDisabled: screenshotMode.isScreenshotMode(),
            })
          ),
          { theme$: theme.theme$ }
        ),
      });
    }

    return {
      aggs: this.aggsService.start({ fieldFormats, uiSettings, indexPatterns }),
      search,
      showError: (e: Error) => {
        this.searchInterceptor.showError(e);
      },
      session: this.sessionService,
      sessionsClient: this.sessionsClient,
      searchSource: this.searchSourceService.start(indexPatterns, searchSourceDependencies),
    };
  }

  public stop() {
    this.aggsService.stop();
    this.searchSourceService.stop();
    this.searchInterceptor.stop();
  }
}
