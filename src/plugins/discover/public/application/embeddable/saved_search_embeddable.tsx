/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subscription } from 'rxjs';
import React from 'react';
import ReactDOM from 'react-dom';
import { Container, Embeddable } from '../../../../embeddable/public';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';
import { SavedSearch } from '../../saved_searches';
import { Adapters, RequestAdapter } from '../../../../inspector/common';
import { ISearchSource } from '../../../../data/common';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import { FilterManager } from '../../../../data/public';
import { DiscoverServices } from '../../build_services';
import { Query, TimeRange } from '../../../../data/common/query';
import { Filter } from '../../../../data/common/es_query/filters';
import { DiscoverGridSettings } from '../components/discover_grid/types';
import { SortOrder } from '../angular/doc_table/components/table_header/helpers';
import { IFieldType } from '../../../../data/common/index_patterns/fields';
import { ElasticSearchHit } from '../doc_views/doc_views_types';
import { IndexPattern } from '../../../../data/common/index_patterns/index_patterns';
import { SavedSearchEmbeddableComponent } from './saved_search_embeddable_component';
import { UiActionsStart } from '../../../../ui_actions/public';

interface SearchProps {
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
  useNewFieldsApi?: boolean;
}

interface SearchEmbeddableConfig {
  savedSearch: SavedSearch;
  editUrl: string;
  editPath: string;
  indexPatterns?: IndexPattern[];
  editable: boolean;
  filterManager: FilterManager;
  services: DiscoverServices;
}

export class SavedSearchEmbeddable
  extends Embeddable<SearchInput, SearchOutput>
  implements ISearchEmbeddable {
  private readonly savedSearch: SavedSearch;
  private inspectorAdapters: Adapters;
  private searchScope?: SearchProps;
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
  reload(): void {}

  private node?: HTMLElement;
  constructor(
    {
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
    this.inspectorAdapters = {
      requests: new RequestAdapter(),
    };
  }

  /**
   *
   * @param {Element} domNode
   */
  public render(domNode: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = domNode;
    ReactDOM.render(
      <SavedSearchEmbeddableComponent {...this.searchScope} embeddable={this} />,
      domNode
    );
  }

  getSavedSearch(): SavedSearch {
    return this.savedSearch;
  }

  public getInspectorAdapters() {
    return this.inspectorAdapters;
  }
}
