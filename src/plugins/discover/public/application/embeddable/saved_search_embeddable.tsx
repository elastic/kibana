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
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { Container, Embeddable } from '../../../../embeddable/public';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';
import { SavedSearch } from '../../saved_searches';
import { Adapters, RequestAdapter } from '../../../../inspector/common';
import { ISearchSource } from '../../../../data/common';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import { esFilters, FilterManager } from '../../../../data/public';
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
import { getDefaultSort } from '../angular/doc_table/lib/get_default_sort';
import { getServices } from '../../kibana_services';
import {
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../common';
import * as columnActions from '../angular/doc_table/actions/columns';
import { getSortForSearchSource } from '../angular/doc_table';
import { handleSourceColumnState } from '../angular/helpers';

interface SearchProps extends SavedSearch {
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
  private panelTitle: string = '';
  private filtersSearchSource?: ISearchSource;
  private subscription?: Subscription;
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private filterManager: FilterManager;
  private abortController?: AbortController;
  private services: DiscoverServices;

  private prevTimeRange?: TimeRange;
  private prevFilters?: Filter[];
  private prevQuery?: Query;
  private prevSearchSessionId?: string;
  private searchProps: SearchProps;

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
    this.initializeSearchEmbeddableProps();

    this.subscription = this.getUpdated$().subscribe(() => {
      this.panelTitle = this.output.title || '';

      if (this.searchProps) {
        this.pushContainerStateParamsToProps(this.searchProps);
      }
    });
  }

  private fetch = async () => {
    const searchSessionId = this.input.searchSessionId;
    const useNewFieldsApi = !this.services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false);

    const { searchSource } = this.savedSearch;

    // Abort any in-progress requests
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    searchSource.setField('size', this.services.uiSettings.get(SAMPLE_SIZE_SETTING));
    searchSource.setField(
      'sort',
      getSortForSearchSource(
        this.searchProps!.sort,
        this.searchProps!.indexPattern,
        this.services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
      )
    );
    if (useNewFieldsApi) {
      searchSource.removeField('fieldsFromSource');
      const fields: Record<string, string> = { field: '*', include_unmapped: 'true' };
      searchSource.setField('fields', [fields]);
    } else {
      searchSource.removeField('fields');
      if (this.searchProps.indexPattern) {
        const fieldNames = this.searchProps.indexPattern.fields.map((field) => field.name);
        searchSource.setField('fieldsFromSource', fieldNames);
      }
    }

    // Log request to inspector
    this.inspectorAdapters.requests!.reset();

    this.searchProps!.isLoading = true;

    this.updateOutput({ loading: true, error: undefined });

    try {
      // Make the request
      const { rawResponse: resp } = await searchSource
        .fetch$({
          abortSignal: this.abortController.signal,
          sessionId: searchSessionId,
          inspector: {
            adapter: this.inspectorAdapters.requests,
            title: i18n.translate('discover.embeddable.inspectorRequestDataTitle', {
              defaultMessage: 'Data',
            }),
            description: i18n.translate('discover.embeddable.inspectorRequestDescription', {
              defaultMessage:
                'This request queries Elasticsearch to fetch the data for the search.',
            }),
          },
        })
        .toPromise();
      this.updateOutput({ loading: false, error: undefined });

      this.searchProps!.rows = resp.hits.hits;
      this.searchProps!.totalHitCount = resp.hits.total as number;
      this.searchProps!.isLoading = false;
    } catch (error) {
      this.updateOutput({ loading: false, error });

      this.searchProps!.isLoading = false;
    }
  };

  private initializeSearchEmbeddableProps() {
    const { searchSource, columns } = this.savedSearch;

    const indexPattern = searchSource.getField('index');

    if (!this.savedSearch.sort || !this.savedSearch.sort.length) {
      this.savedSearch.sort = getDefaultSort(
        indexPattern,
        getServices().uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc')
      );
    }

    const props = {
      columns: this.savedSearch.columns,
      indexPattern,
      sort: getDefaultSort(
        indexPattern,
        getServices().uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc')
      ),
      isLoading: false,
      rows: [],
      searchDescription: this.savedSearch.description,
      description: this.savedSearch.description,
      inspectorAdapters: this.inspectorAdapters,
      searchTitle: this.savedSearch.lastSavedTitle,
      services: this.services,
      onFilter: () => {},
      useNewFieldsApi: true,
      onSetColumns: () => {},
      onSort: () => {},
      onResize: () => {},
      showTimeCol: true,
      ariaLabelledBy: 'documentsAriaLabel',
    };

    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchProps || !this.input.timeRange) return;
      return this.services.timefilter.createFilter(indexPattern, this.input.timeRange);
    });

    this.filtersSearchSource = searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchSource.setParent(this.filtersSearchSource);

    this.searchProps = props;

    this.pushContainerStateParamsToProps(props, { forceFetch: true });

    props.setSortOrder = (sort: SortOrder[]) => {
      this.updateInput({ sort });
    };

    props.isLoading = true;

    props.setColumns = (columns: string[]) => {
      this.updateInput({ columns });
    };

    props.onAddColumn = (columnName: string) => {
      if (!columns) {
        return;
      }
      const updatedColumns = columnActions.addColumn(columns, columnName, true);
      this.updateInput({ columns: updatedColumns });
    };

    props.onRemoveColumn = (columnName: string) => {
      if (!columns) {
        return;
      }
      const updatedColumns = columnActions.removeColumn(columns, columnName, true);
      this.updateInput({ columns: updatedColumns });
    };
    props.sampleSize = 500;

    props.isLoading = true;
    if (this.savedSearch.grid) {
      props.settings = this.savedSearch.grid;
    }
  }

  private async pushContainerStateParamsToProps(
    searchProps: SearchProps,
    { forceFetch = false }: { forceFetch: boolean } = { forceFetch: false }
  ) {
    const isFetchRequired =
      !esFilters.onlyDisabledFiltersChanged(this.input.filters, this.prevFilters) ||
      !_.isEqual(this.prevQuery, this.input.query) ||
      !_.isEqual(this.prevTimeRange, this.input.timeRange) ||
      !_.isEqual(searchProps.sort, this.input.sort || this.savedSearch.sort) ||
      this.prevSearchSessionId !== this.input.searchSessionId;

    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchProps.columns = handleSourceColumnState(
      { columns: this.input.columns || this.savedSearch.columns },
      this.services.core.uiSettings
    ).columns;

    const savedSearchSort =
      this.savedSearch.sort && this.savedSearch.sort.length
        ? this.savedSearch.sort
        : getDefaultSort(
            this.searchProps?.indexPattern,
            getServices().uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc')
          );
    searchProps.sort = this.input.sort || savedSearchSort;
    searchProps.sharedItemTitle = this.panelTitle;
    if (forceFetch || isFetchRequired) {
      this.filtersSearchSource!.setField('filter', this.input.filters);
      this.filtersSearchSource!.setField('query', this.input.query);
      if (this.input.query?.query || this.input.filters?.length) {
        this.filtersSearchSource!.setField('highlightAll', true);
      } else {
        this.filtersSearchSource!.removeField('highlightAll');
      }

      this.prevFilters = this.input.filters;
      this.prevQuery = this.input.query;
      this.prevTimeRange = this.input.timeRange;
      this.prevSearchSessionId = this.input.searchSessionId;
      await this.fetch();
      await this.rerenderComponent(this.node);
    } /* else if (this.searchProps) {
      // trigger a digest cycle to make sure non-fetch relevant changes are propagated
      //this.searchScope.$applyAsync();??
    }*/
  }

  /**
   *
   * @param {Element} domNode
   */
  public async render(domNode: HTMLElement) {
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = domNode;
  }

  private async rerenderComponent(domNode: HTMLElement) {
    this.searchProps.useLegacyTable = this.services.uiSettings.get('doc_table:legacy');
    await this.pushContainerStateParamsToProps(this.searchProps);
    ReactDOM.render(
      <SavedSearchEmbeddableComponent
        {...this.searchProps}
        props={this.searchProps}
        embeddable={this}
      />,
      domNode
    );
  }

  public reload() {
    if (this.searchProps)
      this.pushContainerStateParamsToProps(this.searchProps, { forceFetch: true });
  }

  getSavedSearch(): SavedSearch {
    return this.savedSearch;
  }

  public getInspectorAdapters() {
    return this.inspectorAdapters;
  }
}
