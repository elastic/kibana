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
import { i18n } from '@kbn/i18n';
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
import * as columnActions from '../doc_table/actions/columns';
import { SavedSearch } from '../types';
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
  filter?: (field: string, value: string, operator: string) => void;
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
  private $rootScope: ng.IRootScopeService;
  private $compile: ng.ICompileService;
  private customization: SearchEmbeddableCustomization;
  private inspectorAdaptors: Adapters;
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
      editLabel: i18n.translate('kbn.embeddable.search.editLabel', {
        defaultMessage: 'Edit saved search',
      }),
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
  }

  public getInspectorAdapters() {
    return this.inspectorAdaptors;
  }

  public getPanelTitle() {
    return this.panelTitle;
  }

  public onContainerStateChanged(containerState: ContainerState) {
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
  }

  /**
   *
   * @param {Element} domNode
   * @param {ContainerState} containerState
   */
  public render(domNode: HTMLElement, containerState: ContainerState) {
    this.onContainerStateChanged(containerState);
    this.initializeSearchScope();
    if (!this.searchScope) {
      throw new Error('Search scope not defined');
      return;
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
    searchScope.searchSource = this.savedSearch.searchSource;
    searchScope.inspectorAdapters = this.inspectorAdaptors;

    const timeRangeSearchSource = searchScope.searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchScope || !this.timeRange) {
        return;
      }
      return getTime(this.searchScope.searchSource.getField('index'), this.timeRange);
    });

    this.filtersSearchSource = searchScope.searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchScope.searchSource.setParent(this.filtersSearchSource);

    this.pushContainerStateParamsToScope(searchScope);

    searchScope.setSortOrder = (columnName, direction) => {
      searchScope.sort = this.customization.sort = [columnName, direction];
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    searchScope.addColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      this.savedSearch.searchSource.getField('index').popularizeField(columnName, 1);
      columnActions.addColumn(searchScope.columns, columnName);
      searchScope.columns = this.customization.columns = searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    searchScope.removeColumn = (columnName: string) => {
      if (!searchScope.columns) {
        return;
      }
      this.savedSearch.searchSource.getField('index').popularizeField(columnName, 1);
      columnActions.removeColumn(searchScope.columns, columnName);
      this.customization.columns = searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    searchScope.moveColumn = (columnName, newIndex: number) => {
      if (!searchScope.columns) {
        return;
      }
      columnActions.moveColumn(searchScope.columns, columnName, newIndex);
      this.customization.columns = searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    searchScope.filter = (field, value, operator) => {
      const index = this.savedSearch.searchSource.getField('index').id;
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
}
