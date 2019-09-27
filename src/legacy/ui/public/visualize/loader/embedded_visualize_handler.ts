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

import { EventEmitter } from 'events';
import { debounce, forEach, get, isEqual } from 'lodash';
import * as Rx from 'rxjs';
import { share } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { toastNotifications } from 'ui/notify';
// @ts-ignore untyped dependency
import { AggConfigs } from 'ui/agg_types/agg_configs';
import { SearchSource } from 'ui/courier';
import { QueryFilter } from 'ui/filter_manager/query_filter';
import { TimeRange } from 'src/plugins/data/public';
import { registries } from '../../../../core_plugins/interpreter/public/registries';
import { Inspector } from '../../inspector';
import { Adapters } from '../../inspector/types';
import { PersistedState } from '../../persisted_state';
import { IPrivate } from '../../private';
import { RenderCompleteHelper } from '../../../../../plugins/kibana_utils/public';
import { AppState } from '../../state_management/app_state';
import { timefilter } from '../../timefilter';
import { Vis } from '../../vis';
// @ts-ignore untyped dependency
import { VisFiltersProvider } from '../../vis/vis_filters';
import { PipelineDataLoader } from './pipeline_data_loader';
import { visualizationLoader } from './visualization_loader';
import { onlyDisabledFiltersChanged, Query } from '../../../../core_plugins/data/public';

import { DataAdapter, RequestAdapter } from '../../inspector/adapters';

import { getTableAggs } from './pipeline_helpers/utilities';
import {
  VisResponseData,
  VisSavedObject,
  VisualizeLoaderParams,
  VisualizeUpdateParams,
} from './types';
import { queryGeohashBounds } from './utils';

interface EmbeddedVisualizeHandlerParams extends VisualizeLoaderParams {
  Private: IPrivate;
  queryFilter: any;
  autoFetch?: boolean;
}

export interface RequestHandlerParams {
  searchSource: SearchSource;
  aggs: AggConfigs;
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
  forceFetch: boolean;
  queryFilter: QueryFilter;
  uiState?: PersistedState;
  partialRows?: boolean;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  visParams?: any;
  abortSignal?: AbortSignal;
}

const RENDER_COMPLETE_EVENT = 'render_complete';
const DATA_SHARED_ITEM = 'data-shared-item';
const LOADING_ATTRIBUTE = 'data-loading';
const RENDERING_COUNT_ATTRIBUTE = 'data-rendering-count';

/**
 * A handler to the embedded visualization. It offers several methods to interact
 * with the visualization.
 */
export class EmbeddedVisualizeHandler {
  /**
   * This observable will emit every time new data is loaded for the
   * visualization. The emitted value is the loaded data after it has
   * been transformed by the visualization's response handler.
   * This should not be used by any plugin.
   * @ignore
   */
  public readonly data$: Rx.Observable<any>;
  public readonly inspectorAdapters: Adapters = {};
  private vis: Vis;
  private handlers: any;
  private loaded: boolean = false;
  private destroyed: boolean = false;

  private listeners = new EventEmitter();
  private firstRenderComplete: Promise<void>;
  private renderCompleteHelper: RenderCompleteHelper;
  private shouldForceNextFetch: boolean = false;
  private debouncedFetchAndRender = debounce(() => {
    if (this.destroyed) {
      return;
    }

    const forceFetch = this.shouldForceNextFetch;
    this.shouldForceNextFetch = false;
    this.fetch(forceFetch).then(this.render);
  }, 100);

  private dataLoaderParams: RequestHandlerParams;
  private readonly appState?: AppState;
  private uiState: PersistedState;
  private dataLoader: PipelineDataLoader;
  private dataSubject: Rx.Subject<any>;
  private actions: any = {};
  private events$: Rx.Observable<any>;
  private autoFetch: boolean;
  private abortController?: AbortController;
  private autoRefreshFetchSubscription: Rx.Subscription | undefined;

  constructor(
    private readonly element: HTMLElement,
    savedObject: VisSavedObject,
    params: EmbeddedVisualizeHandlerParams
  ) {
    const { searchSource, vis } = savedObject;

    const {
      appState,
      uiState,
      queryFilter,
      timeRange,
      filters,
      query,
      autoFetch = true,
      Private,
    } = params;

    this.dataLoaderParams = {
      searchSource,
      timeRange,
      query,
      queryFilter,
      filters,
      uiState,
      aggs: vis.getAggConfig(),
      forceFetch: false,
      inspectorAdapters: this.inspectorAdapters,
    };

    // Listen to the first RENDER_COMPLETE_EVENT to resolve this promise
    this.firstRenderComplete = new Promise(resolve => {
      this.listeners.once(RENDER_COMPLETE_EVENT, resolve);
    });

    element.setAttribute(LOADING_ATTRIBUTE, '');
    element.setAttribute(DATA_SHARED_ITEM, '');
    element.setAttribute(RENDERING_COUNT_ATTRIBUTE, '0');

    element.addEventListener('renderComplete', this.onRenderCompleteListener);

    this.autoFetch = autoFetch;
    this.appState = appState;
    this.vis = vis;
    if (uiState) {
      vis._setUiState(uiState);
    }
    this.uiState = this.vis.getUiState();

    this.handlers = {
      vis: this.vis,
      uiState: this.uiState,
      onDestroy: (fn: () => never) => (this.handlers.destroyFn = fn),
    };

    this.vis.on('update', this.handleVisUpdate);
    this.vis.on('reload', this.reload);
    this.uiState.on('change', this.onUiStateChange);
    if (autoFetch) {
      this.autoRefreshFetchSubscription = timefilter.getAutoRefreshFetch$().subscribe(this.reload);
    }

    // This is a hack to give maps visualizations access to data in the
    // globalState, since they can no longer access it via searchSource.
    // TODO: Remove this as a part of elastic/kibana#30593
    this.vis.API.getGeohashBounds = () => {
      return queryGeohashBounds(this.vis, {
        filters: this.dataLoaderParams.filters,
        query: this.dataLoaderParams.query,
      });
    };

    this.dataLoader = new PipelineDataLoader(vis);
    const visFilters: any = Private(VisFiltersProvider);
    this.renderCompleteHelper = new RenderCompleteHelper(element);
    this.inspectorAdapters = this.getActiveInspectorAdapters();
    this.vis.openInspector = this.openInspector;
    this.vis.hasInspector = this.hasInspector;

    // init default actions
    forEach(this.vis.type.events, (event, eventName) => {
      if (event.disabled || !eventName) {
        return;
      } else {
        this.actions[eventName] = event.defaultAction;
      }
    });

    this.handlers.eventsSubject = new Rx.Subject();
    this.vis.eventsSubject = this.handlers.eventsSubject;
    this.events$ = this.handlers.eventsSubject.asObservable().pipe(share());
    this.events$.subscribe(event => {
      if (this.actions[event.name]) {
        event.data.aggConfigs = getTableAggs(this.vis);
        const newFilters = this.actions[event.name](event.data) || [];
        if (event.name === 'brush') {
          const fieldName = newFilters[0].meta.key;
          const $state = this.vis.API.getAppState();
          const existingFilter = $state.filters.find(
            (filter: any) => filter.meta && filter.meta.key === fieldName
          );
          if (existingFilter) {
            Object.assign(existingFilter, newFilters[0]);
          }
        }
        visFilters.pushFilters(newFilters);
      }
    });

    this.dataSubject = new Rx.Subject();
    this.data$ = this.dataSubject.asObservable().pipe(share());

    this.render();
  }

  /**
   * Update properties of the embedded visualization. This method does not allow
   * updating all initial parameters, but only a subset of the ones allowed
   * in {@link VisualizeUpdateParams}.
   *
   * @param params The parameters that should be updated.
   */
  public update(params: VisualizeUpdateParams = {}) {
    // Apply data- attributes to the element if specified
    const dataAttrs = params.dataAttrs;
    if (dataAttrs) {
      Object.keys(dataAttrs).forEach(key => {
        if (dataAttrs[key] === null) {
          this.element.removeAttribute(`data-${key}`);
          return;
        }

        this.element.setAttribute(`data-${key}`, dataAttrs[key]);
      });
    }

    let fetchRequired = false;
    if (
      params.hasOwnProperty('timeRange') &&
      !isEqual(this.dataLoaderParams.timeRange, params.timeRange)
    ) {
      fetchRequired = true;
      this.dataLoaderParams.timeRange = params.timeRange;
    }
    if (
      params.hasOwnProperty('filters') &&
      !onlyDisabledFiltersChanged(this.dataLoaderParams.filters, params.filters)
    ) {
      fetchRequired = true;
      this.dataLoaderParams.filters = params.filters;
    }
    if (params.hasOwnProperty('query') && !isEqual(this.dataLoaderParams.query, params.query)) {
      fetchRequired = true;
      this.dataLoaderParams.query = params.query;
    }

    if (fetchRequired) {
      this.fetchAndRender();
    }
  }

  /**
   * Destroy the underlying Angular scope of the visualization. This should be
   * called whenever you remove the visualization.
   */
  public destroy(): void {
    this.destroyed = true;
    this.cancel();
    this.debouncedFetchAndRender.cancel();
    if (this.autoFetch) {
      if (this.autoRefreshFetchSubscription) this.autoRefreshFetchSubscription.unsubscribe();
    }
    this.vis.removeListener('reload', this.reload);
    this.vis.removeListener('update', this.handleVisUpdate);
    this.element.removeEventListener('renderComplete', this.onRenderCompleteListener);
    this.uiState.off('change', this.onUiStateChange);
    visualizationLoader.destroy(this.element);
    this.renderCompleteHelper.destroy();
    if (this.handlers.destroyFn) {
      this.handlers.destroyFn();
    }
  }

  /**
   * Return the actual DOM element (wrapped in jQuery) of the rendered visualization.
   * This is especially useful if you used `append: true` in the parameters where
   * the visualization will be appended to the specified container.
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * renders visualization with provided data
   * @param response: visualization data
   */
  public render = (response: VisResponseData | null = null): void => {
    const executeRenderer = this.rendererProvider(response);
    if (!executeRenderer) {
      return;
    }

    // TODO: we have this weird situation when we need to render first,
    // and then we call fetch and render... we need to get rid of that.
    executeRenderer().then(() => {
      if (!this.loaded) {
        this.loaded = true;
        if (this.autoFetch) {
          this.fetchAndRender();
        }
      }
    });
  };

  /**
   * Opens the inspector for the embedded visualization. This will return an
   * handler to the inspector to close and interact with it.
   * @return An inspector session to interact with the opened inspector.
   */
  public openInspector = () => {
    return Inspector.open(this.inspectorAdapters, {
      title: this.vis.title,
    });
  };

  public hasInspector = () => {
    return Inspector.isAvailable(this.inspectorAdapters);
  };

  /**
   * Returns a promise, that will resolve (without a value) once the first rendering of
   * the visualization has finished.
   *
   * @returns Promise, that resolves as soon as the visualization is done rendering
   *    for the first time.
   */
  public whenFirstRenderComplete(): Promise<void> {
    return this.firstRenderComplete;
  }

  /**
   * Force the fetch of new data and renders the chart again.
   */
  public reload = () => {
    this.fetchAndRender(true);
  };

  private incrementRenderingCount = () => {
    const renderingCount = Number(this.element.getAttribute(RENDERING_COUNT_ATTRIBUTE) || 0);
    this.element.setAttribute(RENDERING_COUNT_ATTRIBUTE, `${renderingCount + 1}`);
  };

  private onRenderCompleteListener = () => {
    this.listeners.emit(RENDER_COMPLETE_EVENT);
    this.element.removeAttribute(LOADING_ATTRIBUTE);
    this.incrementRenderingCount();
  };

  private onUiStateChange = () => {
    this.fetchAndRender();
  };

  /**
   * Returns an object of all inspectors for this vis object.
   * This must only be called after this.type has properly be initialized,
   * since we need to read out data from the the vis type to check which
   * inspectors are available.
   */
  private getActiveInspectorAdapters = (): Adapters => {
    const adapters: Adapters = {};
    const { inspectorAdapters: typeAdapters } = this.vis.type;

    // Add the requests inspector adapters if the vis type explicitly requested it via
    // inspectorAdapters.requests: true in its definition or if it's using the courier
    // request handler, since that will automatically log its requests.
    if ((typeAdapters && typeAdapters.requests) || this.vis.type.requestHandler === 'courier') {
      adapters.requests = new RequestAdapter();
    }

    // Add the data inspector adapter if the vis type requested it or if the
    // vis is using courier, since we know that courier supports logging
    // its data.
    if ((typeAdapters && typeAdapters.data) || this.vis.type.requestHandler === 'courier') {
      adapters.data = new DataAdapter();
    }

    // Add all inspectors, that are explicitly registered with this vis type
    if (typeAdapters && typeAdapters.custom) {
      Object.entries(typeAdapters.custom).forEach(([key, Adapter]) => {
        adapters[key] = new (Adapter as any)();
      });
    }

    return adapters;
  };

  /**
   * Fetches new data and renders the chart. This will happen debounced for a couple
   * of milliseconds, to bundle fast successive calls into one fetch and render,
   * e.g. while resizing the window, this will be triggered constantly on the resize
   * event.
   *
   * @param  forceFetch=false Whether the request handler should be signaled to forceFetch
   *    (i.e. ignore caching in case it supports it). If at least one call to this
   *    passed `true` the debounced fetch and render will be a force fetch.
   */
  private fetchAndRender = (forceFetch = false): void => {
    this.shouldForceNextFetch = forceFetch || this.shouldForceNextFetch;
    this.element.setAttribute(LOADING_ATTRIBUTE, '');
    this.debouncedFetchAndRender();
  };

  private handleVisUpdate = () => {
    if (this.appState) {
      this.appState.vis = this.vis.getState();
      this.appState.save();
    }

    this.fetchAndRender();
  };

  private cancel = () => {
    if (this.abortController) this.abortController.abort();
  };

  private fetch = (forceFetch: boolean = false) => {
    this.cancel();
    this.abortController = new AbortController();
    this.dataLoaderParams.abortSignal = this.abortController.signal;
    this.dataLoaderParams.aggs = this.vis.getAggConfig();
    this.dataLoaderParams.forceFetch = forceFetch;
    this.dataLoaderParams.inspectorAdapters = this.inspectorAdapters;

    this.vis.filters = { timeRange: this.dataLoaderParams.timeRange };
    this.vis.requestError = undefined;
    this.vis.showRequestError = false;

    return (
      this.dataLoader
        // Don't pass in this.dataLoaderParams directly because it may be modified async in another
        // call to fetch before the previous one has completed
        .fetch({ ...this.dataLoaderParams })
        .then(data => {
          // Pipeline responses never throw errors, so we need to check for
          // `type: 'error'`, and then throw so it can be caught below.
          // TODO: We should revisit this after we have fully migrated
          // to the new expression pipeline infrastructure.
          if (data && data.type === 'error') {
            throw data.error;
          }

          if (data && data.value) {
            this.dataSubject.next(data.value);
          }
          return data;
        })
        .catch(this.handleDataLoaderError)
    );
  };

  /**
   * When dataLoader returns an error, we need to make sure it surfaces in the UI.
   *
   * TODO: Eventually we should add some custom error messages for issues that are
   * frequently encountered by users.
   */
  private handleDataLoaderError = (error: any): void => {
    // If the data loader was aborted then no need to surface this error in the UI
    if (error && error.name === 'AbortError') return;

    // TODO: come up with a general way to cancel execution of pipeline expressions.
    if (this.dataLoaderParams.searchSource && this.dataLoaderParams.searchSource.cancelQueued) {
      this.dataLoaderParams.searchSource.cancelQueued();
    }

    this.vis.requestError = error;
    this.vis.showRequestError =
      error.type && ['NO_OP_SEARCH_STRATEGY', 'UNSUPPORTED_QUERY'].includes(error.type);

    toastNotifications.addDanger({
      title: i18n.translate('common.ui.visualize.dataLoaderError', {
        defaultMessage: 'Error in visualization',
      }),
      text: error.message,
    });
  };

  private rendererProvider = (response: VisResponseData | null) => {
    const renderer = registries.renderers.get(get(response || {}, 'as', 'visualization'));
    const args = [
      this.element,
      get(response, 'value', { visType: this.vis.type.name }),
      this.handlers,
    ];

    if (!renderer) {
      return null;
    }

    return () => renderer.render(...args);
  };
}
