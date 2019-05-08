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

import angular from 'angular';
import _ from 'lodash';
import { SearchSource } from 'ui/courier';
import {
  ContainerState,
  Embeddable,
  EmbeddableState,
  OnEmbeddableStateChanged,
  TimeRange,
} from 'ui/embeddable';
import { Filters, Query } from 'ui/embeddable/types';
import { RequestAdapter } from 'ui/inspector/adapters';
import { Adapters } from 'ui/inspector/types';
import { getTime } from 'ui/timefilter/get_time';
import { IndexPattern } from 'ui/index_patterns';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { getRequestInspectorStats, getResponseInspectorStats } from 'ui/courier';
import * as columnActions from '../doc_table/actions/columns';
import { SavedSearch } from '../types';
import searchTemplate from './search_template.html';
import { getSort } from '../doc_table/lib';

const config = chrome.getUiSettingsClient();

interface SearchScope extends ng.IScope {
  columns?: string[];
  description?: string;
  sort?: string[];
  sharedItemTitle?: string;
  inspectorAdapters?: Adapters;
  setSortOrder?: (column: string, columnDirection: string) => void;
  removeColumn?: (column: string) => void;
  addColumn?: (column: string) => void;
  moveColumn?: (column: string, index: number) => void;
  filter?: (field: string, value: string, operator: string) => void;
  hits?: any[];
  indexPattern?: IndexPattern;
  totalHitCount?: number;
}

interface SearchEmbeddableCustomization {
  sort?: string[];
  columns?: string[];
}

interface SearchEmbeddableConfig {
  onEmbeddableStateChanged: OnEmbeddableStateChanged;
  savedSearch: SavedSearch;
  editUrl: string;
  editable: boolean;
  $rootScope: ng.IRootScopeService;
  $compile: ng.ICompileService;
}

export class SearchEmbeddable extends Embeddable {
  private readonly onEmbeddableStateChanged: OnEmbeddableStateChanged;
  private readonly savedSearch: SavedSearch;
  private readonly inspectorAdaptors: Adapters;
  private readonly $compile: ng.ICompileService;
  private $rootScope: ng.IRootScopeService;
  private customization: SearchEmbeddableCustomization;
  private searchScope?: SearchScope;
  private panelTitle: string = '';
  private filtersSearchSource: SearchSource;
  private timeRange?: TimeRange;
  private filters?: Filters;
  private query?: Query;
  private searchInstance?: JQLite;

  constructor({
    onEmbeddableStateChanged,
    savedSearch,
    editable,
    editUrl,
    $rootScope,
    $compile,
  }: SearchEmbeddableConfig) {
    super({
      title: savedSearch.title,
      editUrl,
      editable,
      indexPatterns: _.compact([savedSearch.searchSource.getField('index')]),
    });
    this.onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedSearch = savedSearch;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.customization = {};
    this.inspectorAdaptors = {
      requests: new RequestAdapter(),
    };
    this.initializeSearchScope();
    this.fetch();
  }

  public getInspectorAdapters() {
    return this.inspectorAdaptors;
  }

  public onContainerStateChanged(containerState: ContainerState) {
    const shouldFetch = this.isFetchNeeded(containerState);
    this.customization = containerState.embeddableCustomization || {};
    this.filters = containerState.filters;
    this.query = containerState.query;
    this.timeRange = containerState.timeRange;
    this.panelTitle = '';
    if (!containerState.hidePanelTitles) {
      this.panelTitle =
        containerState.customTitle !== undefined
          ? containerState.customTitle
          : this.savedSearch.title;
    }

    if (this.searchScope) {
      this.pushContainerStateParamsToScope(this.searchScope);
    }

    if (shouldFetch) {
      this.fetch();
    }
  }

  public render(domNode: HTMLElement, containerState: ContainerState) {
    if (!this.searchScope) {
      throw new Error('Search scope not defined');
    }
    this.searchInstance = this.$compile(searchTemplate)(this.searchScope);
    const rootNode = angular.element(domNode);
    rootNode.append(this.searchInstance);
  }

  public destroy() {
    this.savedSearch.destroy();
    if (this.searchInstance) {
      this.searchInstance.remove();
    }
    if (this.searchScope) {
      this.searchScope.$destroy();
      delete this.searchScope;
    }
  }

  private initializeSearchScope() {
    const searchScope: SearchScope = this.$rootScope.$new();

    searchScope.description = this.savedSearch.description;
    const { searchSource } = this.savedSearch;
    const indexPattern = (searchScope.indexPattern = searchSource.getField('index'));

    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchScope || !this.timeRange) {
        return;
      }
      return getTime(indexPattern, this.timeRange);
    });

    this.filtersSearchSource = searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchSource.setParent(this.filtersSearchSource);

    this.pushContainerStateParamsToScope(searchScope);

    searchScope.setSortOrder = (...sort) => {
      const customization = { sort };
      this.emitEmbeddableStateChange({ customization });
    };

    searchScope.addColumn = (columnName: string) => {
      if (!searchScope.columns) return;
      searchSource.getField('index').popularizeField(columnName, 1);
      columnActions.addColumn(searchScope.columns, columnName);
      const customization = { columns: searchScope.columns };
      this.emitEmbeddableStateChange({ customization });
    };

    searchScope.removeColumn = (columnName: string) => {
      if (!searchScope.columns) return;
      searchSource.getField('index').popularizeField(columnName, 1);
      columnActions.removeColumn(searchScope.columns, columnName);
      const customization = { columns: searchScope.columns };
      this.emitEmbeddableStateChange({ customization });
    };

    searchScope.moveColumn = (columnName, newIndex: number) => {
      if (!searchScope.columns) return;
      columnActions.moveColumn(searchScope.columns, columnName, newIndex);
      const customization = { columns: searchScope.columns };
      this.emitEmbeddableStateChange({ customization });
    };

    searchScope.filter = (field, value, operator) => {
      const index = searchSource.getField('index').id;
      const stagedFilter = {
        field,
        value,
        operator,
        index,
      };
      this.emitEmbeddableStateChange({
        ...this.getEmbeddableState(),
        stagedFilter,
      });
    };

    this.searchScope = searchScope;
  }

  private emitEmbeddableStateChange(embeddableState: EmbeddableState) {
    this.onEmbeddableStateChanged(embeddableState);
  }

  private getEmbeddableState(): EmbeddableState {
    return {
      customization: this.customization,
    };
  }

  private pushContainerStateParamsToScope(searchScope: SearchScope) {
    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchScope.columns = this.customization.columns || this.savedSearch.columns;
    searchScope.sort = this.customization.sort || this.savedSearch.sort;
    searchScope.sharedItemTitle = this.panelTitle;

    this.filtersSearchSource.setField('filter', this.filters);
    this.filtersSearchSource.setField('query', this.query);
  }

  public reload() {
    this.fetch();
  }

  /**
   * We only need to re-fetch the data if filters, query, time range, or sort changes. Other things
   * (e.g. reordering columns) shouldn't trigger a fetch.
   * @param nextState The next container state
   */
  private isFetchNeeded(nextState: ContainerState) {
    const { customization = {} } = this;
    const { embeddableCustomization = {} } = nextState;
    return (
      !_.isEqual(this.filters, nextState.filters) ||
      !_.isEqual(this.query, nextState.query) ||
      !_.isEqual(this.timeRange, nextState.timeRange) ||
      !_.isEqual(customization.sort, embeddableCustomization.sort)
    );
  }

  private async fetch() {
    if (!this.searchScope) return;
    const { searchSource } = this.savedSearch;

    searchSource.setField('size', config.get('discover:sampleSize'));
    searchSource.setField('sort', getSort(this.searchScope.sort, this.searchScope.indexPattern));

    // Log request to inspector
    this.inspectorAdaptors.requests.reset();
    const title = i18n.translate('kbn.docTable.inspectorRequestDataTitle', {
      defaultMessage: 'Data',
    });
    const description = i18n.translate('kbn.docTable.inspectorRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
    });
    const inspectorRequest = this.inspectorAdaptors.requests.start(title, { description });
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then((body: any) => {
      inspectorRequest.json(body);
    });

    // Make the request
    const resp = await searchSource.fetch();

    // Log response to inspector
    inspectorRequest.stats(getResponseInspectorStats(searchSource, resp)).ok({ json: resp });

    // Apply the changes to the angular scope
    this.searchScope.$apply(() => {
      if (!this.searchScope) return;
      this.searchScope.hits = resp.hits.hits;
      this.searchScope.totalHitCount = resp.hits.total;
    });
  }
}
