/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { estypes } from '@elastic/elasticsearch';
import { BfetchPublicSetup } from '@kbn/bfetch-plugin/public';
import { handleWarnings } from '@kbn/search-response-warnings';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  StartServicesAccessor,
} from '@kbn/core/public';
import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import {
  cidrFunction,
  dateRangeFunction,
  eqlRawResponse,
  esRawResponse,
  existsFilterFunction,
  extendedBoundsFunction,
  fieldFunction,
  geoBoundingBoxFunction,
  geoPointFunction,
  ipPrefixFunction,
  ipRangeFunction,
  ISearchGeneric,
  kibana,
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
} from '../../common/search';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import { ConfigSchema } from '../../config';
import { NowProviderInternalContract } from '../now_provider';
import { DataPublicPluginStart, DataStartDependencies } from '../types';
import { AggsService } from './aggs';
import { createUsageCollector, SearchUsageCollector } from './collectors';
import { getEql, getEsaggs, getEsdsl, getEssql, getEsql } from './expressions';

import { ISearchInterceptor, SearchInterceptor } from './search_interceptor';
import { ISessionsClient, ISessionService, SessionsClient, SessionService } from './session';
import { registerSearchSessionsMgmt } from './session/sessions_mgmt';
import { createConnectedSearchSessionIndicator } from './session/session_indicator';
import { ISearchSetup, ISearchStart } from './types';

/** @internal */
export interface SearchServiceSetupDependencies {
  bfetch: BfetchPublicSetup;
  expressions: ExpressionsSetup;
  usageCollection?: UsageCollectionSetup;
  management: ManagementSetup;
  nowProvider: NowProviderInternalContract;
}

/** @internal */
export interface SearchServiceStartDependencies {
  fieldFormats: FieldFormatsStart;
  indexPatterns: DataViewsContract;
  inspector: InspectorStartContract;
  screenshotMode: ScreenshotModePluginStart;
  scriptedFieldsEnabled: boolean;
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
      nowProvider,
      this.usageCollector
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
      searchConfig: this.initializerContext.config.get().search,
    });

    expressions.registerFunction(
      getEsaggs({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(kibana);
    expressions.registerFunction(cidrFunction);
    expressions.registerFunction(dateRangeFunction);
    expressions.registerFunction(extendedBoundsFunction);
    expressions.registerFunction(ipPrefixFunction);
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

    expressions.registerFunction(
      getEsdsl({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(
      getEssql({ getStartServices } as {
        getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
      })
    );
    expressions.registerFunction(
      getEsql({ getStartServices } as {
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
      uiSettings,
      registerFunction: expressions.registerFunction,
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
    { http, theme, uiSettings, chrome, application, notifications, i18n: i18nStart }: CoreStart,
    {
      fieldFormats,
      indexPatterns,
      inspector,
      screenshotMode,
      scriptedFieldsEnabled,
    }: SearchServiceStartDependencies
  ): ISearchStart {
    const search = ((request, options = {}) => {
      return this.searchInterceptor.search(request, options);
    }) as ISearchGeneric;

    const loadingCount$ = new BehaviorSubject(0);
    http.addLoadingCountSource(loadingCount$);

    const aggs = this.aggsService.start({ fieldFormats, indexPatterns });

    const warningsServices = {
      i18n: i18nStart,
      inspector,
      notifications,
      theme,
    };

    const searchSourceDependencies: SearchSourceDependencies = {
      aggs,
      getConfig: uiSettings.get.bind(uiSettings),
      search,
      onResponse: (request, response, options) => {
        if (!options.disableWarningToasts) {
          const { rawResponse } = response;

          const requestName = options.inspector?.title
            ? options.inspector.title
            : i18n.translate('data.searchService.anonymousRequestTitle', {
                defaultMessage: 'Request',
              });
          const requestAdapter = options.inspector?.adapter
            ? options.inspector?.adapter
            : new RequestAdapter();
          if (!options.inspector?.adapter) {
            const requestResponder = requestAdapter.start(requestName, {
              id: request.id,
            });
            requestResponder.json(request.body);
            requestResponder.ok({ json: response });
          }

          handleWarnings({
            request: request.body as estypes.SearchRequest,
            requestAdapter,
            requestId: request.id,
            requestName,
            response: rawResponse,
            services: warningsServices,
          });
        }
        return response;
      },
      scriptedFieldsEnabled,
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
              usageCollector: this.usageCollector,
              tourDisabled: screenshotMode.isScreenshotMode(),
            })
          ),
          { theme$: theme.theme$ }
        ),
      });
    }

    return {
      aggs,
      search,
      showError: (e) => {
        this.searchInterceptor.showError(e);
      },
      showWarnings: (adapter, callback) => {
        adapter?.getRequests().forEach((request) => {
          const rawResponse = (
            request.response?.json as { rawResponse: estypes.SearchResponse | undefined }
          )?.rawResponse;

          if (!rawResponse) {
            return;
          }
          handleWarnings({
            callback,
            request: request.json as estypes.SearchRequest,
            requestAdapter: adapter,
            requestId: request.id,
            requestName: request.name,
            response: rawResponse,
            services: warningsServices,
          });
        });
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
