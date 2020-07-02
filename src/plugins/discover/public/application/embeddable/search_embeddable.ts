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
import './search_embeddable.scss';
import angular from 'angular';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { UiActionsStart, APPLY_FILTER_TRIGGER } from '../../../../ui_actions/public';
import { RequestAdapter, Adapters } from '../../../../inspector/public';
import {
  esFilters,
  Filter,
  TimeRange,
  FilterManager,
  getTime,
  Query,
  IFieldType,
} from '../../../../data/public';
import { Container, Embeddable } from '../../../../embeddable/public';
import * as columnActions from '../angular/doc_table/actions/columns';
import searchTemplate from './search_template.html';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';
import { SortOrder } from '../angular/doc_table/components/table_header/helpers';
import { getSortForSearchSource } from '../angular/doc_table/lib/get_sort_for_search_source';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
  getServices,
  IndexPattern,
  ISearchSource,
} from '../../kibana_services';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import { SavedSearch } from '../..';
import { SAMPLE_SIZE_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';

interface SearchScope extends ng.IScope {
  columns?: string[];
  description?: string;
  sort?: SortOrder[];
  sharedItemTitle?: string;
  inspectorAdapters?: Adapters;
  setSortOrder?: (sortPair: SortOrder[]) => void;
  removeColumn?: (column: string) => void;
  addColumn?: (column: string) => void;
  moveColumn?: (column: string, index: number) => void;
  filter?: (field: IFieldType, value: string[], operator: string) => void;
  hits?: any[];
  indexPattern?: IndexPattern;
  totalHitCount?: number;
  isLoading?: boolean;
}

interface SearchEmbeddableConfig {
  $rootScope: ng.IRootScopeService;
  $compile: ng.ICompileService;
  savedSearch: SavedSearch;
  editUrl: string;
  editPath: string;
  indexPatterns?: IndexPattern[];
  editable: boolean;
  filterManager: FilterManager;
}

export class SearchEmbeddable extends Embeddable<SearchInput, SearchOutput>
  implements ISearchEmbeddable {
  private readonly savedSearch: SavedSearch;
  private $rootScope: ng.IRootScopeService;
  private $compile: ng.ICompileService;
  private inspectorAdaptors: Adapters;
  private searchScope?: SearchScope;
  private panelTitle: string = '';
  private filtersSearchSource?: ISearchSource;
  private searchInstance?: JQLite;
  private autoRefreshFetchSubscription?: Subscription;
  private subscription?: Subscription;
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private filterManager: FilterManager;
  private abortController?: AbortController;

  private prevTimeRange?: TimeRange;
  private prevFilters?: Filter[];
  private prevQuery?: Query;

  constructor(
    {
      $rootScope,
      $compile,
      savedSearch,
      editUrl,
      editPath,
      indexPatterns,
      editable,
      filterManager,
    }: SearchEmbeddableConfig,
    initialInput: SearchInput,
    private readonly executeTriggerActions: UiActionsStart['executeTriggerActions'],
    parent?: Container
  ) {
    super(
      initialInput,
      {
        defaultTitle: savedSearch.title,
        editUrl,
        editPath,
        editApp: 'discover',
        indexPatterns,
        editable,
      },
      parent
    );

    this.filterManager = filterManager;
    this.savedSearch = savedSearch;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.inspectorAdaptors = {
      requests: new RequestAdapter(),
    };
    this.initializeSearchScope();

    this.autoRefreshFetchSubscription = getServices()
      .timefilter.getAutoRefreshFetch$()
      .subscribe(this.fetch);

    this.subscription = Rx.merge(this.getOutput$(), this.getInput$()).subscribe(() => {
      this.panelTitle = this.output.title || '';

      if (this.searchScope) {
        this.pushContainerStateParamsToScope(this.searchScope);
      }
    });
  }

  public getInspectorAdapters() {
    return this.inspectorAdaptors;
  }

  public getSavedSearch() {
    return this.savedSearch;
  }

  /**
   *
   * @param {Element} domNode
   */
  public render(domNode: HTMLElement) {
    if (!this.searchScope) {
      throw new Error('Search scope not defined');
    }
    this.searchInstance = this.$compile(searchTemplate)(this.searchScope);
    const rootNode = angular.element(domNode);
    rootNode.append(this.searchInstance);

    this.pushContainerStateParamsToScope(this.searchScope);
  }

  public destroy() {
    super.destroy();
    this.savedSearch.destroy();
    if (this.searchInstance) {
      this.searchInstance.remove();
    }
    if (this.searchScope) {
      this.searchScope.$destroy();
      delete this.searchScope;
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.autoRefreshFetchSubscription) {
      this.autoRefreshFetchSubscription.unsubscribe();
    }
    if (this.abortController) this.abortController.abort();
  }

  private initializeSearchScope() {
    const searchScope: SearchScope = (this.searchScope = this.$rootScope.$new());

    searchScope.description = this.savedSearch.description;
    searchScope.inspectorAdapters = this.inspectorAdaptors;

    const { searchSource } = this.savedSearch;
    const indexPattern = (searchScope.indexPattern = searchSource.getField('index'))!;

    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchScope || !this.input.timeRange) return;
      return getTime(indexPattern, this.input.timeRange);
    });

    this.filtersSearchSource = searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchSource.setParent(this.filtersSearchSource);

    this.pushContainerStateParamsToScope(searchScope);

    searchScope.setSortOrder = (sort) => {
      this.updateInput({ sort });
    };

    searchScope.addColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      indexPattern.popularizeField(columnName, 1);
      const columns = columnActions.addColumn(searchScope.columns, columnName);
      this.updateInput({ columns });
    };

    searchScope.removeColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      const columns = columnActions.removeColumn(searchScope.columns, columnName);
      this.updateInput({ columns });
    };

    searchScope.moveColumn = (columnName, newIndex: number) => {
      if (!searchScope.columns) {
        return;
      }
      const columns = columnActions.moveColumn(searchScope.columns, columnName, newIndex);
      this.updateInput({ columns });
    };

    searchScope.filter = async (field, value, operator) => {
      let filters = esFilters.generateFilters(
        this.filterManager,
        field,
        value,
        operator,
        indexPattern.id!
      );
      filters = filters.map((filter) => ({
        ...filter,
        $state: { store: esFilters.FilterStateStore.APP_STATE },
      }));

      await this.executeTriggerActions(APPLY_FILTER_TRIGGER, {
        embeddable: this,
        filters,
      });
    };
  }

  public reload() {
    this.fetch();
  }

  private fetch = async () => {
    if (!this.searchScope) return;

    const { searchSource } = this.savedSearch;

    // Abort any in-progress requests
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    searchSource.setField('size', getServices().uiSettings.get(SAMPLE_SIZE_SETTING));
    searchSource.setField(
      'sort',
      getSortForSearchSource(
        this.searchScope.sort,
        this.searchScope.indexPattern,
        getServices().uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
      )
    );

    // Log request to inspector
    this.inspectorAdaptors.requests.reset();
    const title = i18n.translate('discover.embeddable.inspectorRequestDataTitle', {
      defaultMessage: 'Data',
    });
    const description = i18n.translate('discover.embeddable.inspectorRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
    });
    const inspectorRequest = this.inspectorAdaptors.requests.start(title, { description });
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then((body: Record<string, unknown>) => {
      inspectorRequest.json(body);
    });
    this.updateOutput({ loading: true, error: undefined });

    try {
      // Make the request
      const resp = await searchSource.fetch({
        abortSignal: this.abortController.signal,
      });
      this.updateOutput({ loading: false, error: undefined });

      // Log response to inspector
      inspectorRequest.stats(getResponseInspectorStats(searchSource, resp)).ok({ json: resp });

      // Apply the changes to the angular scope
      this.searchScope.$apply(() => {
        this.searchScope!.hits = resp.hits.hits;
        this.searchScope!.totalHitCount = resp.hits.total;
      });
    } catch (error) {
      this.updateOutput({ loading: false, error });
    }
  };

  private pushContainerStateParamsToScope(searchScope: SearchScope) {
    const isFetchRequired =
      !esFilters.onlyDisabledFiltersChanged(this.input.filters, this.prevFilters) ||
      !_.isEqual(this.prevQuery, this.input.query) ||
      !_.isEqual(this.prevTimeRange, this.input.timeRange) ||
      !_.isEqual(searchScope.sort, this.input.sort || this.savedSearch.sort);

    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchScope.columns = this.input.columns || this.savedSearch.columns;
    searchScope.sort = this.input.sort || this.savedSearch.sort;
    searchScope.sharedItemTitle = this.panelTitle;

    if (isFetchRequired) {
      this.filtersSearchSource!.setField('filter', this.input.filters);
      this.filtersSearchSource!.setField('query', this.input.query);

      this.fetch();

      this.prevFilters = this.input.filters;
      this.prevQuery = this.input.query;
      this.prevTimeRange = this.input.timeRange;
    } else if (this.searchScope) {
      // trigger a digest cycle to make sure non-fetch relevant changes are propagated
      this.searchScope.$applyAsync();
    }
  }
}
