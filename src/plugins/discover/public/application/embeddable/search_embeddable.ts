/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './search_embeddable.scss';
import angular from 'angular';
import _ from 'lodash';
import { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { UiActionsStart } from '../../../../ui_actions/public';
import { RequestAdapter, Adapters } from '../../../../inspector/public';
import {
  APPLY_FILTER_TRIGGER,
  esFilters,
  Filter,
  TimeRange,
  FilterManager,
  Query,
  IFieldType,
} from '../../../../data/public';
import { Container, Embeddable } from '../../../../embeddable/public';
import * as columnActions from '../angular/doc_table/actions/columns';
import searchTemplate from './search_template.html';
import searchTemplateGrid from './search_template_datagrid.html';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';
import { SortOrder } from '../angular/doc_table/components/table_header/helpers';
import { getSortForSearchSource } from '../angular/doc_table';
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
import { DiscoverGridSettings } from '../components/discover_grid/types';
import { DiscoverServices } from '../../build_services';
import { ElasticSearchHit } from '../doc_views/doc_views_types';
import { getDefaultSort } from '../angular/doc_table/lib/get_default_sort';

interface SearchScope extends ng.IScope {
  columns?: string[];
  settings?: DiscoverGridSettings;
  description?: string;
  sort?: SortOrder[];
  sharedItemTitle?: string;
  inspectorAdapters?: Adapters;
  setSortOrder?: (sortPair: SortOrder[]) => void;
  setColumns?: (columns: string[]) => void;
  removeColumn?: (column: string) => void;
  addColumn?: (column: string) => void;
  moveColumn?: (column: string, index: number) => void;
  filter?: (field: IFieldType, value: string[], operator: string) => void;
  hits?: ElasticSearchHit[];
  indexPattern?: IndexPattern;
  totalHitCount?: number;
  isLoading?: boolean;
  showTimeCol?: boolean;
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
  services: DiscoverServices;
}

export class SearchEmbeddable
  extends Embeddable<SearchInput, SearchOutput>
  implements ISearchEmbeddable {
  private readonly savedSearch: SavedSearch;
  private $rootScope: ng.IRootScopeService;
  private $compile: ng.ICompileService;
  private inspectorAdapters: Adapters;
  private searchScope?: SearchScope;
  private panelTitle: string = '';
  private filtersSearchSource?: ISearchSource;
  private searchInstance?: JQLite;
  private subscription?: Subscription;
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private filterManager: FilterManager;
  private abortController?: AbortController;
  private services: DiscoverServices;

  private prevTimeRange?: TimeRange;
  private prevFilters?: Filter[];
  private prevQuery?: Query;
  private prevSearchSessionId?: string;

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
      services,
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
    this.services = services;
    this.filterManager = filterManager;
    this.savedSearch = savedSearch;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.inspectorAdapters = {
      requests: new RequestAdapter(),
    };
    this.initializeSearchScope();

    this.subscription = this.getUpdated$().subscribe(() => {
      this.panelTitle = this.output.title || '';

      if (this.searchScope) {
        this.pushContainerStateParamsToScope(this.searchScope);
      }
    });
  }

  public getInspectorAdapters() {
    return this.inspectorAdapters;
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
    this.searchInstance = this.$compile(
      this.services.uiSettings.get('doc_table:legacy', true) ? searchTemplate : searchTemplateGrid
    )(this.searchScope);
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

    if (this.abortController) this.abortController.abort();
  }

  private initializeSearchScope() {
    const searchScope: SearchScope = (this.searchScope = this.$rootScope.$new());

    searchScope.description = this.savedSearch.description;
    searchScope.inspectorAdapters = this.inspectorAdapters;

    const { searchSource } = this.savedSearch;
    const indexPattern = (searchScope.indexPattern = searchSource.getField('index'))!;

    if (!this.savedSearch.sort || !this.savedSearch.sort.length) {
      this.savedSearch.sort = getDefaultSort(
        indexPattern,
        getServices().uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc')
      );
    }

    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchScope || !this.input.timeRange) return;
      return this.services.timefilter.createFilter(indexPattern, this.input.timeRange);
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

    searchScope.setColumns = (columns: string[]) => {
      this.updateInput({ columns });
    };

    if (this.savedSearch.grid) {
      searchScope.settings = this.savedSearch.grid;
    }
    searchScope.showTimeCol = !this.services.uiSettings.get('doc_table:hideTimeColumn', false);

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
    if (this.searchScope)
      this.pushContainerStateParamsToScope(this.searchScope, { forceFetch: true });
  }

  private fetch = async () => {
    const searchSessionId = this.input.searchSessionId;

    if (!this.searchScope) return;

    const { searchSource } = this.savedSearch;

    // Abort any in-progress requests
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    searchSource.setField('size', this.services.uiSettings.get(SAMPLE_SIZE_SETTING));
    searchSource.setField(
      'sort',
      getSortForSearchSource(
        this.searchScope.sort,
        this.searchScope.indexPattern,
        this.services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
      )
    );

    // Log request to inspector
    this.inspectorAdapters.requests!.reset();
    const title = i18n.translate('discover.embeddable.inspectorRequestDataTitle', {
      defaultMessage: 'Data',
    });
    const description = i18n.translate('discover.embeddable.inspectorRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
    });

    const inspectorRequest = this.inspectorAdapters.requests!.start(title, {
      description,
      searchSessionId,
    });
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then((body: Record<string, unknown>) => {
      inspectorRequest.json(body);
    });
    this.updateOutput({ loading: true, error: undefined });

    try {
      // Make the request
      const resp = await searchSource.fetch({
        abortSignal: this.abortController.signal,
        sessionId: searchSessionId,
      });
      this.updateOutput({ loading: false, error: undefined });

      // Log response to inspector
      inspectorRequest.stats(getResponseInspectorStats(resp, searchSource)).ok({ json: resp });

      // Apply the changes to the angular scope
      this.searchScope.$apply(() => {
        this.searchScope!.hits = resp.hits.hits;
        this.searchScope!.totalHitCount = resp.hits.total;
      });
    } catch (error) {
      this.updateOutput({ loading: false, error });
    }
  };

  private pushContainerStateParamsToScope(
    searchScope: SearchScope,
    { forceFetch = false }: { forceFetch: boolean } = { forceFetch: false }
  ) {
    const isFetchRequired =
      !esFilters.onlyDisabledFiltersChanged(this.input.filters, this.prevFilters) ||
      !_.isEqual(this.prevQuery, this.input.query) ||
      !_.isEqual(this.prevTimeRange, this.input.timeRange) ||
      !_.isEqual(searchScope.sort, this.input.sort || this.savedSearch.sort) ||
      this.prevSearchSessionId !== this.input.searchSessionId;

    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchScope.columns = this.input.columns || this.savedSearch.columns;
    const savedSearchSort =
      this.savedSearch.sort && this.savedSearch.sort.length
        ? this.savedSearch.sort
        : getDefaultSort(
            this.searchScope?.indexPattern,
            getServices().uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc')
          );
    searchScope.sort = this.input.sort || savedSearchSort;
    searchScope.sharedItemTitle = this.panelTitle;

    if (forceFetch || isFetchRequired) {
      this.filtersSearchSource!.setField('filter', this.input.filters);
      this.filtersSearchSource!.setField('query', this.input.query);

      this.prevFilters = this.input.filters;
      this.prevQuery = this.input.query;
      this.prevTimeRange = this.input.timeRange;
      this.prevSearchSessionId = this.input.searchSessionId;
      this.fetch();
    } else if (this.searchScope) {
      // trigger a digest cycle to make sure non-fetch relevant changes are propagated
      this.searchScope.$applyAsync();
    }
  }
}
