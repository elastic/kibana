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
import { StaticIndexPattern } from 'ui/index_patterns';
import { RequestAdapter } from 'ui/inspector/adapters';
import { Adapters } from 'ui/inspector/types';
import { getTime } from 'ui/timefilter/get_time';
import { Subscription } from 'rxjs';
import * as Rx from 'rxjs';
import { Filter, FilterStateStore } from '@kbn/es-query';
import {
  APPLY_FILTER_TRIGGER,
  Embeddable,
  executeTriggerActions,
  Container,
} from '../../../../embeddable_api/public';
import * as columnActions from '../doc_table/actions/columns';
import { SavedSearch } from '../types';
import searchTemplate from './search_template.html';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';

interface SearchScope extends ng.IScope {
  columns?: string[];
  description?: string;
  sort?: string[];
  searchSource?: SearchSource;
  sharedItemTitle?: string;
  inspectorAdapters?: Adapters;
  setSortOrder?: (column: string, columnDirection: string) => void;
  removeColumn?: (column: string) => void;
  addColumn?: (column: string) => void;
  moveColumn?: (column: string, index: number) => void;
  filter?: (field: { name: string; scripted: boolean }, value: string[], operator: string) => void;
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
  courier: any;
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
  private courier: any;
  private subscription?: Subscription;
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private filterGen: FilterManager;

  constructor(
    {
      $rootScope,
      $compile,
      courier,
      savedSearch,
      editUrl,
      indexPatterns,
      editable,
      queryFilter,
    }: SearchEmbeddableConfig,
    initialInput: SearchInput,
    parent?: Container
  ) {
    super(
      initialInput,
      { defaultTitle: savedSearch.title, editUrl, indexPatterns, editable },
      parent
    );

    this.filterGen = getFilterGenerator(queryFilter);
    this.courier = courier;
    this.savedSearch = savedSearch;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.inspectorAdaptors = {
      requests: new RequestAdapter(),
    };

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
    this.initializeSearchScope();
    if (!this.searchScope) {
      throw new Error('Search scope not defined');
      return;
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
  }

  private initializeSearchScope() {
    const searchScope: SearchScope = this.$rootScope.$new();

    searchScope.description = this.savedSearch.description;
    searchScope.searchSource = this.savedSearch.searchSource;
    searchScope.inspectorAdapters = this.inspectorAdaptors;

    const timeRangeSearchSource = searchScope.searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchScope || !this.input.timeRange) {
        return;
      }
      return getTime(this.searchScope.searchSource.getField('index'), this.input.timeRange);
    });

    this.filtersSearchSource = searchScope.searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchScope.searchSource.setParent(this.filtersSearchSource);

    this.pushContainerStateParamsToScope(searchScope);

    searchScope.setSortOrder = (columnName, direction) => {
      searchScope.sort = [columnName, direction];
      this.updateInput({ sort: searchScope.sort });
    };

    searchScope.addColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      this.savedSearch.searchSource.getField('index').popularizeField(columnName, 1);
      columnActions.addColumn(searchScope.columns, columnName);
      searchScope.columns = searchScope.columns;
      this.updateInput({ columns: searchScope.columns });
    };

    searchScope.removeColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      this.savedSearch.searchSource.getField('index').popularizeField(columnName, 1);
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
      const index = this.savedSearch.searchSource.getField('index').id;

      let filters = this.filterGen.generate(field, value, operator, index);
      filters = filters.map(filter => ({
        ...filter,
        $state: { store: FilterStateStore.APP_STATE },
      }));

      await executeTriggerActions(APPLY_FILTER_TRIGGER, {
        embeddable: this,
        triggerContext: {
          filters,
        },
      });
    };

    this.searchScope = searchScope;
  }

  public reload() {
    this.courier.fetch();
  }

  private pushContainerStateParamsToScope(searchScope: SearchScope) {
    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchScope.columns = this.input.columns || this.savedSearch.columns;
    searchScope.sort = this.input.sort || this.savedSearch.sort;
    searchScope.sharedItemTitle = this.panelTitle;

    this.filtersSearchSource.setField('filter', this.input.filters);
    this.filtersSearchSource.setField('query', this.input.query);

    // Sadly this is neccessary to tell the angular component to refetch the data.
    this.courier.fetch();
  }
}
