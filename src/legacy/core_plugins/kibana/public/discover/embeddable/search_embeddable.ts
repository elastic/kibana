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

// @ts-ignore
import { getFilterGenerator } from 'ui/filter_manager';
import angular from 'angular';
import _ from 'lodash';
import { SearchSource } from 'ui/courier';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
} from 'ui/courier/utils/courier_inspector_utils';
import { StaticIndexPattern } from 'ui/index_patterns';
import { RequestAdapter } from 'ui/inspector/adapters';
import { Adapters } from 'ui/inspector/types';
import { Subscription } from 'rxjs';
import * as Rx from 'rxjs';
import { Filter, FilterStateStore } from '@kbn/es-query';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { TimeRange } from 'src/plugins/data/public';
import { setup as data } from '../../../../data/public/legacy';
import { Query, onlyDisabledFiltersChanged, getTime } from '../../../../data/public';
import {
  APPLY_FILTER_TRIGGER,
  Embeddable,
  Container,
  ExecuteTriggerActions,
} from '../../../../embeddable_api/public/np_ready/public';
import * as columnActions from '../doc_table/actions/columns';
import { SavedSearch } from '../types';
import searchTemplate from './search_template.html';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';
import { getSort } from '../doc_table/lib/get_sort';
import { SortOrder } from '../doc_table/components/table_header/helpers';

const config = chrome.getUiSettingsClient();

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
  filter?: (field: { name: string; scripted: boolean }, value: string[], operator: string) => void;
  hits?: any[];
  indexPattern?: StaticIndexPattern;
  totalHitCount?: number;
  isLoading?: boolean;
}

export interface FilterManager {
  generate: (
    field: {
      name: string;
      scripted: boolean;
    },
    values: string | string[],
    operation: string,
    index: number
  ) => Filter[];
}

interface SearchEmbeddableConfig {
  $rootScope: ng.IRootScopeService;
  $compile: ng.ICompileService;
  savedSearch: SavedSearch;
  editUrl: string;
  indexPatterns?: StaticIndexPattern[];
  editable: boolean;
  queryFilter: unknown;
}

export const SEARCH_EMBEDDABLE_TYPE = 'search';

export class SearchEmbeddable extends Embeddable<SearchInput, SearchOutput>
  implements ISearchEmbeddable {
  private readonly savedSearch: SavedSearch;
  private $rootScope: ng.IRootScopeService;
  private $compile: ng.ICompileService;
  private inspectorAdaptors: Adapters;
  private searchScope?: SearchScope;
  private panelTitle: string = '';
  private filtersSearchSource: SearchSource;
  private searchInstance?: JQLite;
  private autoRefreshFetchSubscription?: Subscription;
  private subscription?: Subscription;
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private filterGen: FilterManager;

  private prevTimeRange?: TimeRange;
  private prevFilters?: Filter[];
  private prevQuery?: Query;

  constructor(
    {
      $rootScope,
      $compile,
      savedSearch,
      editUrl,
      indexPatterns,
      editable,
      queryFilter,
    }: SearchEmbeddableConfig,
    initialInput: SearchInput,
    private readonly executeTriggerActions: ExecuteTriggerActions,
    parent?: Container
  ) {
    super(
      initialInput,
      { defaultTitle: savedSearch.title, editUrl, indexPatterns, editable },
      parent
    );

    this.filterGen = getFilterGenerator(queryFilter);
    this.savedSearch = savedSearch;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.inspectorAdaptors = {
      requests: new RequestAdapter(),
    };
    this.initializeSearchScope();
    this.autoRefreshFetchSubscription = data.timefilter.timefilter
      .getAutoRefreshFetch$()
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
   * @param {ContainerState} containerState
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
    this.savedSearch.searchSource.cancelQueued();
  }

  private initializeSearchScope() {
    const searchScope: SearchScope = (this.searchScope = this.$rootScope.$new());

    searchScope.description = this.savedSearch.description;
    searchScope.inspectorAdapters = this.inspectorAdaptors;

    const { searchSource } = this.savedSearch;
    const indexPattern = (searchScope.indexPattern = searchSource.getField('index'));

    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchScope || !this.input.timeRange) {
        return;
      }
      return getTime(indexPattern, this.input.timeRange);
    });

    this.filtersSearchSource = searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchSource.setParent(this.filtersSearchSource);

    this.pushContainerStateParamsToScope(searchScope);

    searchScope.setSortOrder = sort => {
      this.updateInput({ sort });
    };

    searchScope.addColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      indexPattern.popularizeField(columnName, 1);
      columnActions.addColumn(searchScope.columns, columnName);
      this.updateInput({ columns: searchScope.columns });
    };

    searchScope.removeColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      columnActions.removeColumn(searchScope.columns, columnName);
      this.updateInput({ columns: searchScope.columns });
    };

    searchScope.moveColumn = (columnName, newIndex: number) => {
      if (!searchScope.columns) {
        return;
      }
      columnActions.moveColumn(searchScope.columns, columnName, newIndex);
      this.updateInput({ columns: searchScope.columns });
    };

    searchScope.filter = async (field, value, operator) => {
      let filters = this.filterGen.generate(field, value, operator, indexPattern.id);
      filters = filters.map(filter => ({
        ...filter,
        $state: { store: FilterStateStore.APP_STATE },
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
    searchSource.cancelQueued();

    searchSource.setField('size', config.get('discover:sampleSize'));
    searchSource.setField('sort', getSort(this.searchScope.sort, this.searchScope.indexPattern));

    // Log request to inspector
    this.inspectorAdaptors.requests.reset();
    const title = i18n.translate('kbn.embeddable.inspectorRequestDataTitle', {
      defaultMessage: 'Data',
    });
    const description = i18n.translate('kbn.embeddable.inspectorRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
    });
    const inspectorRequest = this.inspectorAdaptors.requests.start(title, { description });
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then((body: any) => {
      inspectorRequest.json(body);
    });

    this.searchScope.isLoading = true;

    try {
      // Make the request
      const resp = await searchSource.fetch();

      this.searchScope.isLoading = false;

      // Log response to inspector
      inspectorRequest.stats(getResponseInspectorStats(searchSource, resp)).ok({ json: resp });

      // Apply the changes to the angular scope
      this.searchScope.$apply(() => {
        this.searchScope!.hits = resp.hits.hits;
        this.searchScope!.totalHitCount = resp.hits.total;
      });
    } catch (error) {
      // If the fetch was aborted, no need to surface this in the UI
      if (error.name === 'AbortError') return;

      toastNotifications.addError(error, {
        title: i18n.translate('kbn.embeddable.errorTitle', {
          defaultMessage: 'Error fetching data',
        }),
      });
    }
  };

  private pushContainerStateParamsToScope(searchScope: SearchScope) {
    const isFetchRequired =
      !onlyDisabledFiltersChanged(this.input.filters, this.prevFilters) ||
      !_.isEqual(this.prevQuery, this.input.query) ||
      !_.isEqual(this.prevTimeRange, this.input.timeRange) ||
      !_.isEqual(searchScope.sort, this.input.sort || this.savedSearch.sort);

    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchScope.columns = this.input.columns || this.savedSearch.columns;
    searchScope.sort = this.input.sort || this.savedSearch.sort;
    searchScope.sharedItemTitle = this.panelTitle;

    if (isFetchRequired) {
      this.filtersSearchSource.setField('filter', this.input.filters);
      this.filtersSearchSource.setField('query', this.input.query);

      this.fetch();

      this.prevFilters = this.input.filters;
      this.prevQuery = this.input.query;
      this.prevTimeRange = this.input.timeRange;
    }
  }
}
