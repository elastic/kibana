/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom, Subscription } from 'rxjs';
import { onlyDisabledFiltersChanged, Filter } from '@kbn/es-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { I18nProvider } from '@kbn/i18n-react';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { Container, Embeddable } from '@kbn/embeddable-plugin/public';
import { Adapters, RequestAdapter } from '@kbn/inspector-plugin/common';
import { APPLY_FILTER_TRIGGER, FilterManager, generateFilters } from '@kbn/data-plugin/public';
import { ISearchSource, Query, TimeRange, FilterStateStore } from '@kbn/data-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';
import { SavedSearch } from '../services/saved_searches';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import { DiscoverServices } from '../build_services';
import { SavedSearchEmbeddableComponent } from './saved_search_embeddable_component';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  DOC_TABLE_LEGACY,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_FIELD_STATISTICS,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../common';
import * as columnActions from '../components/doc_table/actions/columns';
import { handleSourceColumnState } from '../utils/state_helpers';
import { DiscoverGridProps } from '../components/discover_grid/discover_grid';
import { DiscoverGridSettings } from '../components/discover_grid/types';
import { DocTableProps } from '../components/doc_table/doc_table_wrapper';
import { getDefaultSort } from '../components/doc_table';
import { SortOrder } from '../components/doc_table/components/table_header/helpers';
import { VIEW_MODE } from '../components/view_mode_toggle';
import { updateSearchSource } from './utils/update_search_source';
import { FieldStatisticsTable } from '../application/main/components/field_stats_table';
import { ElasticSearchHit } from '../types';

export type SearchProps = Partial<DiscoverGridProps> &
  Partial<DocTableProps> & {
    settings?: DiscoverGridSettings;
    description?: string;
    sharedItemTitle?: string;
    inspectorAdapters?: Adapters;
    services: DiscoverServices;

    filter?: (field: DataViewField, value: string[], operator: string) => void;
    hits?: ElasticSearchHit[];
    totalHitCount?: number;
    onMoveColumn?: (column: string, index: number) => void;
    onUpdateRowHeight?: (rowHeight?: number) => void;
  };

interface SearchEmbeddableConfig {
  savedSearch: SavedSearch;
  editUrl: string;
  editPath: string;
  indexPatterns?: DataView[];
  editable: boolean;
  filterManager: FilterManager;
  services: DiscoverServices;
}

export class SavedSearchEmbeddable
  extends Embeddable<SearchInput, SearchOutput>
  implements ISearchEmbeddable
{
  private readonly savedSearch: SavedSearch;
  private inspectorAdapters: Adapters;
  private panelTitle: string = '';
  private filtersSearchSource!: ISearchSource;
  private subscription?: Subscription;
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  private filterManager: FilterManager;
  private abortController?: AbortController;
  private services: DiscoverServices;

  private prevTimeRange?: TimeRange;
  private prevFilters?: Filter[];
  private prevQuery?: Query;
  private prevSearchSessionId?: string;
  private searchProps?: SearchProps;

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
    if (!this.searchProps) return;

    const { searchSource } = this.savedSearch;

    // Abort any in-progress requests
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    updateSearchSource(
      searchSource,
      this.searchProps!.indexPattern,
      this.searchProps!.sort,
      useNewFieldsApi,
      {
        sampleSize: this.services.uiSettings.get(SAMPLE_SIZE_SETTING),
        defaultSort: this.services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
      }
    );

    // Log request to inspector
    this.inspectorAdapters.requests!.reset();

    this.searchProps!.isLoading = true;

    this.updateOutput({ loading: true, error: undefined });

    const parentContext = this.input.executionContext;
    const child: KibanaExecutionContext = {
      type: this.type,
      name: 'discover',
      id: this.savedSearch.id!,
      description: this.output.title || this.output.defaultTitle || '',
      url: this.output.editUrl,
    };
    const executionContext = parentContext
      ? {
          ...parentContext,
          child,
        }
      : child;

    try {
      // Make the request
      const { rawResponse: resp } = await lastValueFrom(
        searchSource.fetch$({
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
          executionContext,
        })
      );
      this.updateOutput({ loading: false, error: undefined });

      this.searchProps!.rows = resp.hits.hits;
      this.searchProps!.totalHitCount = resp.hits.total as number;
      this.searchProps!.isLoading = false;
    } catch (error) {
      if (!this.destroyed) {
        this.updateOutput({ loading: false, error });

        this.searchProps!.isLoading = false;
      }
    }
  };

  private getDefaultSort(dataView?: DataView) {
    const defaultSortOrder = this.services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc');
    const hidingTimeColumn = this.services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false);
    return getDefaultSort(dataView, defaultSortOrder, hidingTimeColumn);
  }

  private initializeSearchEmbeddableProps() {
    const { searchSource } = this.savedSearch;

    const indexPattern = searchSource.getField('index');

    if (!indexPattern) {
      return;
    }

    if (!this.savedSearch.sort || !this.savedSearch.sort.length) {
      this.savedSearch.sort = this.getDefaultSort(indexPattern);
    }

    const props: SearchProps = {
      columns: this.savedSearch.columns,
      indexPattern,
      isLoading: false,
      sort: this.getDefaultSort(indexPattern),
      rows: [],
      searchDescription: this.savedSearch.description,
      description: this.savedSearch.description,
      inspectorAdapters: this.inspectorAdapters,
      searchTitle: this.savedSearch.title,
      services: this.services,
      onAddColumn: (columnName: string) => {
        if (!props.columns) {
          return;
        }
        const updatedColumns = columnActions.addColumn(props.columns, columnName, true);
        this.updateInput({ columns: updatedColumns });
      },
      onRemoveColumn: (columnName: string) => {
        if (!props.columns) {
          return;
        }
        const updatedColumns = columnActions.removeColumn(props.columns, columnName, true);
        this.updateInput({ columns: updatedColumns });
      },
      onMoveColumn: (columnName: string, newIndex: number) => {
        if (!props.columns) {
          return;
        }
        const columns = columnActions.moveColumn(props.columns, columnName, newIndex);
        this.updateInput({ columns });
      },
      onSetColumns: (columns: string[]) => {
        this.updateInput({ columns });
      },
      onSort: (sort: string[][]) => {
        const sortOrderArr: SortOrder[] = [];
        sort.forEach((arr) => {
          sortOrderArr.push(arr as SortOrder);
        });
        this.updateInput({ sort: sortOrderArr });
      },
      sampleSize: 500,
      onFilter: async (field, value, operator) => {
        let filters = generateFilters(
          this.filterManager,
          // @ts-expect-error
          field,
          value,
          operator,
          indexPattern.id!
        );
        filters = filters.map((filter) => ({
          ...filter,
          $state: { store: FilterStateStore.APP_STATE },
        }));

        await this.executeTriggerActions(APPLY_FILTER_TRIGGER, {
          embeddable: this,
          filters,
        });
      },
      useNewFieldsApi: !this.services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false),
      showTimeCol: !this.services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false),
      ariaLabelledBy: 'documentsAriaLabel',
      rowHeightState: this.input.rowHeight || this.savedSearch.rowHeight,
      onUpdateRowHeight: (rowHeight) => {
        this.updateInput({ rowHeight });
      },
    };

    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      if (!this.searchProps || !this.input.timeRange) return;
      return this.services.timefilter.createFilter(indexPattern, this.input.timeRange);
    });

    this.filtersSearchSource = searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchSource.setParent(this.filtersSearchSource);

    this.pushContainerStateParamsToProps(props);

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
      !onlyDisabledFiltersChanged(this.input.filters, this.prevFilters) ||
      !isEqual(this.prevQuery, this.input.query) ||
      !isEqual(this.prevTimeRange, this.input.timeRange) ||
      !isEqual(searchProps.sort, this.input.sort || this.savedSearch.sort) ||
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
        : this.getDefaultSort(this.searchProps?.indexPattern);
    searchProps.sort = this.input.sort || savedSearchSort;
    searchProps.sharedItemTitle = this.panelTitle;
    searchProps.rowHeightState = this.input.rowHeight || this.savedSearch.rowHeight;
    if (forceFetch || isFetchRequired) {
      this.filtersSearchSource.setField('filter', this.input.filters);
      this.filtersSearchSource.setField('query', this.input.query);
      if (this.input.query?.query || this.input.filters?.length) {
        this.filtersSearchSource.setField('highlightAll', true);
      } else {
        this.filtersSearchSource.removeField('highlightAll');
      }

      this.prevFilters = this.input.filters;
      this.prevQuery = this.input.query;
      this.prevTimeRange = this.input.timeRange;
      this.prevSearchSessionId = this.input.searchSessionId;
      this.searchProps = searchProps;
      await this.fetch();
    } else if (this.searchProps && this.node) {
      this.searchProps = searchProps;
    }

    if (this.node) {
      this.renderReactComponent(this.node, this.searchProps!);
    }
  }

  /**
   *
   * @param {Element} domNode
   */
  public async render(domNode: HTMLElement) {
    if (!this.searchProps) {
      throw new Error('Search props not defined');
    }
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
    this.node = domNode;
  }

  private renderReactComponent(domNode: HTMLElement, searchProps: SearchProps) {
    if (!this.searchProps) {
      return;
    }

    if (
      this.services.uiSettings.get(SHOW_FIELD_STATISTICS) === true &&
      this.savedSearch.viewMode === VIEW_MODE.AGGREGATED_LEVEL &&
      searchProps.services &&
      searchProps.indexPattern &&
      Array.isArray(searchProps.columns)
    ) {
      ReactDOM.render(
        <I18nProvider>
          <KibanaThemeProvider theme$={searchProps.services.core.theme.theme$}>
            <KibanaContextProvider services={searchProps.services}>
              <FieldStatisticsTable
                indexPattern={searchProps.indexPattern}
                columns={searchProps.columns}
                savedSearch={this.savedSearch}
                filters={this.input.filters}
                query={this.input.query}
                onAddFilter={searchProps.onFilter}
                searchSessionId={this.input.searchSessionId}
              />
            </KibanaContextProvider>
          </KibanaThemeProvider>
        </I18nProvider>,
        domNode
      );
      return;
    }
    const useLegacyTable = this.services.uiSettings.get(DOC_TABLE_LEGACY);
    const props = {
      savedSearch: this.savedSearch,
      searchProps,
      useLegacyTable,
    };
    if (searchProps.services) {
      ReactDOM.render(
        <I18nProvider>
          <KibanaThemeProvider theme$={searchProps.services.core.theme.theme$}>
            <KibanaContextProvider services={searchProps.services}>
              <SavedSearchEmbeddableComponent {...props} />
            </KibanaContextProvider>
          </KibanaThemeProvider>
        </I18nProvider>,
        domNode
      );
    }
  }

  public reload() {
    if (this.searchProps) {
      this.pushContainerStateParamsToProps(this.searchProps, { forceFetch: true });
    }
  }

  public getSavedSearch(): SavedSearch {
    return this.savedSearch;
  }

  public getInspectorAdapters() {
    return this.inspectorAdapters;
  }

  public getDescription() {
    return this.savedSearch.description;
  }

  public destroy() {
    super.destroy();
    if (this.searchProps) {
      delete this.searchProps;
    }
    this.subscription?.unsubscribe();

    if (this.abortController) this.abortController.abort();
  }
}
