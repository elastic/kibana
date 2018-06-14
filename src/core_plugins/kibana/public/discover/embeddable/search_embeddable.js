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
import { Embeddable } from 'ui/embeddable';
import searchTemplate from './search_template.html';
import * as columnActions from 'ui/doc_table/actions/columns';
import { getTime } from 'ui/timefilter/get_time';

export class SearchEmbeddable extends Embeddable {
  constructor({ onEmbeddableStateChanged, savedSearch, editUrl, loader, $rootScope, $compile }) {
    super({
      metadata: {
        title: savedSearch.title,
        editUrl,
        indexPattern: savedSearch.searchSource.get('index')
      }
    });
    this.onEmbeddableStateChanged = onEmbeddableStateChanged;
    this.savedSearch = savedSearch;
    this.loader = loader;
    this.$rootScope = $rootScope;
    this.$compile = $compile;
    this.customization = {};
  }

  emitEmbeddableStateChange(embeddableState) {
    this.onEmbeddableStateChanged(embeddableState);
  }

  getEmbeddableState() {
    return {
      customization: this.customization
    };
  }

  pushContainerStateParamsToScope() {
    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.

    this.searchScope.columns = this.customization.columns || this.savedSearch.columns;
    this.searchScope.sort = this.customization.sort || this.savedSearch.sort;
    this.searchScope.sharedItemTitle = this.panelTitle;

    this.filtersSearchSource.set('filter', this.filters);
    this.filtersSearchSource.set('query', this.query);
  }

  onContainerStateChanged(containerState) {
    this.customization = containerState.embeddableCustomization || {};
    this.filters = containerState.filters;
    this.query = containerState.query;
    this.timeRange = containerState.timeRange;
    this.panelTitle = '';
    if (!containerState.hidePanelTitles) {
      this.panelTitle = containerState.customTitle !== undefined ?
        containerState.customTitle :
        this.savedSearch.title;
    }

    if (this.searchScope) {
      this.pushContainerStateParamsToScope();
    }
  }

  initializeSearchScope() {
    this.searchScope = this.$rootScope.$new();

    this.searchScope.description = this.savedSearch.description;
    this.searchScope.searchSource = this.savedSearch.searchSource;

    const timeRangeSearchSource = this.searchScope.searchSource.new();
    timeRangeSearchSource.filter(() => {
      return getTime(this.searchScope.searchSource.get('index'), this.timeRange);
    });

    this.filtersSearchSource = this.searchScope.searchSource.new();
    this.filtersSearchSource.inherits(timeRangeSearchSource);

    this.searchScope.searchSource.inherits(this.filtersSearchSource);

    this.pushContainerStateParamsToScope();

    this.searchScope.setSortOrder = (columnName, direction) => {
      this.searchScope.sort = this.customization.sort = [columnName, direction];
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.addColumn = (columnName) => {
      this.savedSearch.searchSource.get('index').popularizeField(columnName, 1);
      columnActions.addColumn(this.searchScope.columns, columnName);
      this.searchScope.columns = this.customization.columns = this.searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.removeColumn = (columnName) => {
      this.savedSearch.searchSource.get('index').popularizeField(columnName, 1);
      columnActions.removeColumn(this.searchScope.columns, columnName);
      this.customization.columns = this.searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.moveColumn = (columnName, newIndex) => {
      columnActions.moveColumn(this.searchScope.columns, columnName, newIndex);
      this.customization.columns = this.searchScope.columns;
      this.emitEmbeddableStateChange(this.getEmbeddableState());
    };

    this.searchScope.filter = (field, value, operator) => {
      const index = this.savedSearch.searchSource.get('index').id;
      const stagedFilter = {
        field,
        value,
        operator,
        index
      };
      this.emitEmbeddableStateChange({
        ...this.getEmbeddableState(),
        stagedFilter,
      });
    };
  }

  /**
   *
   * @param {Element} domNode
   * @param {ContainerState} containerState
   */
  render(domNode, containerState) {
    this.onContainerStateChanged(containerState);
    this.domNode = domNode;
    this.initializeSearchScope();
    this.searchInstance = this.$compile(searchTemplate)(this.searchScope);
    const rootNode = angular.element(domNode);
    rootNode.append(this.searchInstance);
  }

  destroy() {
    this.savedSearch.destroy();
    if (this.searchScope) {
      this.searchInstance.remove();
      this.searchScope.$destroy();
      delete this.searchScope;
    }
  }
}
