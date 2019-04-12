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
import {
  APPLY_FILTER_TRIGGER,
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  executeTriggerActions,
  Filters,
  OutputSpec,
  Query,
  CONTEXT_MENU_TRIGGER,
  TimeRange,
  Trigger,
  Container,
} from 'plugins/embeddable_api/index';
import { SearchSource } from 'ui/courier';
import { generateFilters } from 'ui/filter_manager/generate_filter_shape';
import { StaticIndexPattern } from 'ui/index_patterns';
import { RequestAdapter } from 'ui/inspector/adapters';
import { Adapters } from 'ui/inspector/types';
import { getTime } from 'ui/timefilter/get_time';
import { Subscription } from 'rxjs';
import * as columnActions from '../doc_table/actions/columns';
import { SavedSearch } from '../types';
import {
  SEARCH_EMBEDDABLE_TYPE,
  SEARCH_OUTPUT_SPEC,
  SearchEmbeddableFactory,
} from './search_embeddable_factory';
import { SEARCH_ROW_CLICK_TRIGGER } from './search_embeddable_factory';
import searchTemplate from './search_template.html';

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

interface SearchEmbeddableConfig {
  $rootScope: ng.IRootScopeService;
  $compile: ng.ICompileService;
  courier: any;
  savedSearch: SavedSearch;
  editUrl: string;
  indexPatterns?: StaticIndexPattern[];
}

export interface SearchInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filters;
  hidePanelTitles?: boolean;
  columns?: string[];
  sort?: string[];
}

export interface SearchOutput extends EmbeddableOutput {
  editUrl: string;
  title: string;
  indexPatterns?: StaticIndexPattern[];
}

export class SearchEmbeddable extends Embeddable<SearchInput, SearchOutput> {
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

  constructor(
    { $rootScope, $compile, courier, savedSearch, editUrl, indexPatterns }: SearchEmbeddableConfig,
    initialInput: SearchInput,
    parent?: Container
  ) {
    super(
      SEARCH_EMBEDDABLE_TYPE,
      initialInput,
      { title: savedSearch.title, editUrl, indexPatterns },
      parent
    );

    this.courier = courier;
    this.savedSearch = savedSearch;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.inspectorAdaptors = {
      requests: new RequestAdapter(),
    };

    this.subscription = this.getInput$().subscribe(() => {
      this.panelTitle = '';
      if (!this.input.hidePanelTitles) {
        this.panelTitle = this.input.title ? this.input.title : this.savedSearch.title;
      }

      if (this.searchScope) {
        this.pushContainerStateParamsToScope(this.searchScope);
      }
    });
  }

  public getInspectorAdapters() {
    return this.inspectorAdaptors;
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

  public supportsTrigger(trigger: Trigger) {
    return !![CONTEXT_MENU_TRIGGER, APPLY_FILTER_TRIGGER, SEARCH_ROW_CLICK_TRIGGER].find(
      id => id === trigger.id
    );
  }

  public getOutputSpec(trigger?: Trigger) {
    if (!this.searchScope || !this.searchScope.columns) {
      return {};
    }

    let outputSpec: OutputSpec = {};

    if (trigger && trigger.id === SEARCH_ROW_CLICK_TRIGGER) {
      this.searchScope.columns.forEach(column => {
        const columnId = column.replace(/\s/g, '');
        outputSpec[columnId] = {
          displayName: 'Clicked row cell',
          description: 'The value of the cell that was clicked on',
          accessPath: `triggerContext.${columnId.replace(/\s/g, '')}`,
          id: columnId,
        };
      });
    } else if (trigger && trigger.id === APPLY_FILTER_TRIGGER) {
      outputSpec = {
        ['fieldName']: {
          displayName: 'Clicked column name',
          description: 'A filter that was clicked on',
          accessPath: 'triggerContext.fieldName',
          id: 'fieldName',
        },
        ['fieldValue']: {
          displayName: 'Clicked cell value',
          description: 'The value of the cell that was clicked on',
          accessPath: 'triggerContext.fieldValue',
          id: 'fieldValue',
        },
      };
    }

    outputSpec = {
      ...outputSpec,
      ...SEARCH_OUTPUT_SPEC,
    };

    Object.values(outputSpec).forEach(propertySpec => {
      if (!this.output.hasOwnProperty(propertySpec.accessPath.substr('element.'.length))) {
        return;
      }
      const path = propertySpec.accessPath.substr('element.'.length);

      // @ts-ignore Take this stuff out of here for commit 1
      const value = this.output[path];
      if (!value) {
        throw new Error(`No data at ${path}`);
      }

      if (typeof value === 'object') {
        outputSpec[propertySpec.id].value = JSON.stringify(value);
      } else {
        outputSpec[propertySpec.id].value = value;
      }
    });

    return outputSpec;
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
      const stagedFilter = {
        field,
        value,
        operation: operator,
        index,
      };

      let filters = generateFilters(stagedFilter);
      filters = filters.map(filter => ({
        ...filter,
        $state: { store: 'appState' },
      }));

      await executeTriggerActions(APPLY_FILTER_TRIGGER, {
        embeddable: this,
        triggerContext: {
          stagedFilter,
          filters,
        },
      });
    };

    this.searchScope = searchScope;
  }

  private pushContainerStateParamsToScope(searchScope: SearchScope) {
    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchScope.columns = this.input.columns || this.savedSearch.columns;
    searchScope.sort = this.input.sort || this.savedSearch.sort;
    searchScope.sharedItemTitle = this.panelTitle;

    // Awful hack to get search sources to send out an initial query. Angular should be going away
    // soon and we can get rid of this.
    if (searchScope.searchSource) {
      if (!searchScope.$$phase) {
        searchScope.$apply(() => {
          searchScope.searchSource.triggerFetch = searchScope.searchSource.triggerFetch
            ? searchScope.searchSource.triggerFetch + 1
            : 1;
        });
      }
    }

    this.filtersSearchSource.setField('filter', this.input.filters);
    this.filtersSearchSource.setField('query', this.input.query);

    // Sadly this is neccessary to tell the angular component to refetch the data.
    this.courier.fetch();
  }
}
