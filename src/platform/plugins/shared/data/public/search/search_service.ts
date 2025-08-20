/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { estypes } from '@elastic/elasticsearch';
import { handleWarnings } from '@kbn/search-response-warnings';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  StartServicesAccessor,
} from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { RequestAdapter } from '@kbn/inspector-plugin/common/adapters/request';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SearchSourceDependencies } from '../../common/search';
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
  SearchSourceService,
  selectFilterFunction,
} from '../../common/search';
import {
  getShardDelayBucketAgg,
  SHARD_DELAY_AGG_NAME,
} from '../../common/search/aggs/buckets/shard_delay';
import { aggShardDelay } from '../../common/search/aggs/buckets/shard_delay_fn';
import type { ConfigSchema } from '../../server/config';
import type { NowProviderInternalContract } from '../now_provider';
import type { DataPublicPluginStart, DataStartDependencies } from '../types';
import { AggsService } from './aggs';
import type { SearchUsageCollector } from './collectors';
import { createUsageCollector } from './collectors';
import { getEql, getEsaggs, getEsdsl, getEssql, getEsql } from './expressions';
import type { ISearchInterceptor } from './search_interceptor';
import { SearchInterceptor } from './search_interceptor';
import type { ISessionsClient, ISessionService } from './session';
import { SessionsClient, SessionService } from './session';
import {
  registerSearchSessionsMgmt,
  updateSearchSessionMgmtSectionTitle,
} from './session/sessions_mgmt';
import { createConnectedSearchSessionIndicator } from './session/session_indicator';
import type { ISearchSetup, ISearchStart } from './types';
import { openSearchSessionsFlyout } from './session/sessions_mgmt';

/** @internal */
export interface SearchServiceSetupDependencies {
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
  share: SharePluginStart;
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
    { expressions, usageCollection, nowProvider, management }: SearchServiceSetupDependencies
  ): ISearchSetup {
    const { http, getStartServices, notifications, uiSettings, executionContext } = core;
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
      toasts: notifications.toasts,
      executionContext,
      http,
      uiSettings,
      startServices: getStartServices(),
      usageCollector: this.usageCollector!,
      session: this.sessionService,
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

      const searchSessionsApp = registerSearchSessionsMgmt(
        core as CoreSetup<DataStartDependencies>,
        {
          management,
          searchUsageCollector: this.usageCollector!,
          sessionsClient: this.sessionsClient,
        },
        sessionsConfig,
        this.initializerContext.env.packageInfo.version
      );
      updateSearchSessionMgmtSectionTitle(getStartServices, searchSessionsApp);
    }

    return {
      aggs,
      usageCollector: this.usageCollector!,
      session: this.sessionService,
      sessionsClient: this.sessionsClient,
    };
  }

  public start(
    coreStart: CoreStart,
    {
      fieldFormats,
      indexPatterns,
      inspector,
      screenshotMode,
      scriptedFieldsEnabled,
      share,
    }: SearchServiceStartDependencies
  ): ISearchStart {
    const { http, uiSettings, chrome, application, notifications, ...startServices } = coreStart;

    const search = ((request, options = {}) => {
      return this.searchInterceptor.search(request, options);
    }) as ISearchGeneric;

    const loadingCount$ = new BehaviorSubject(0);
    http.addLoadingCountSource(loadingCount$);

    const aggs = this.aggsService.start({ fieldFormats, indexPatterns });

    const warningsServices = {
      inspector,
      notifications,
      ...startServices,
    };

    const searchSourceDependencies: SearchSourceDependencies = {
      aggs,
      getConfig: uiSettings.get.bind(uiSettings),
      search,
      dataViews: indexPatterns,
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
          startServices
        ),
      });
    }

    return {
      aggs,
      search,
      showError: (e) => {
        this.searchInterceptor.showError(e);
      },
      showSearchSessionsFlyout: openSearchSessionsFlyout({
        coreStart,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        usageCollector: this.usageCollector!,
        config: config.search.sessions,
        sessionsClient: this.sessionsClient,
        share,
      }),
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
