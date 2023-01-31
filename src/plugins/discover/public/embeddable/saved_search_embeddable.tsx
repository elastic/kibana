/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom, Subscription } from 'rxjs';
import {
  onlyDisabledFiltersChanged,
  Filter,
  Query,
  TimeRange,
  FilterStateStore,
} from '@kbn/es-query';
import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { I18nProvider } from '@kbn/i18n-react';
import type { KibanaExecutionContext } from '@kbn/core/public';
import { Container, Embeddable, FilterableEmbeddable } from '@kbn/embeddable-plugin/public';
import { Adapters, RequestAdapter } from '@kbn/inspector-plugin/common';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import {
  APPLY_FILTER_TRIGGER,
  FilterManager,
  generateFilters,
  mapAndFlattenFilters,
} from '@kbn/data-plugin/public';
import { ISearchSource } from '@kbn/data-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { getSortForEmbeddable, SortPair } from '../utils/sorting';
import { RecordRawType } from '../application/main/hooks/use_saved_search';
import { buildDataTableRecord } from '../utils/build_data_record';
import { DataTableRecord, EsHitRecord } from '../types';
import { ISearchEmbeddable, SearchInput, SearchOutput } from './types';
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
import { VIEW_MODE } from '../components/view_mode_toggle';
import { updateSearchSource } from './utils/update_search_source';
import { FieldStatisticsTable } from '../application/main/components/field_stats_table';
import { getRawRecordType } from '../application/main/utils/get_raw_record_type';
import { fetchSql } from '../application/main/utils/fetch_sql';

export type SearchProps = Partial<DiscoverGridProps> &
  Partial<DocTableProps> & {
    settings?: DiscoverGridSettings;
    description?: string;
    sharedItemTitle?: string;
    inspectorAdapters?: Adapters;
    services: DiscoverServices;
    filter?: (field: DataViewField, value: string[], operator: string) => void;
    hits?: DataTableRecord[];
    totalHitCount?: number;
    onMoveColumn?: (column: string, index: number) => void;
    onUpdateRowHeight?: (rowHeight?: number) => void;
    onUpdateRowsPerPage?: (rowsPerPage?: number) => void;
  };

export interface SearchEmbeddableConfig {
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
  implements ISearchEmbeddable, FilterableEmbeddable
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
  private prevSort?: SortOrder[];
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
    this.panelTitle = savedSearch.title ?? '';
    this.initializeSearchEmbeddableProps();

    this.subscription = this.getUpdated$().subscribe(() => {
      const titleChanged = this.output.title && this.panelTitle !== this.output.title;
      if (titleChanged) {
        this.panelTitle = this.output.title || '';
      }
      if (!this.searchProps) {
        return;
      }
      const isFetchRequired = this.isFetchRequired(this.searchProps);
      const isRerenderRequired = this.isRerenderRequired(this.searchProps);
      if (titleChanged || isFetchRequired || isRerenderRequired) {
        this.reload(isFetchRequired);
      }
    });
  }

  public reportsEmbeddableLoad() {
    return true;
  }

  private fetch = async () => {
    const searchSessionId = this.input.searchSessionId;
    const useNewFieldsApi = !this.services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false);
    if (!this.searchProps) return;

    const { searchSource } = this.savedSearch;

    const prevAbortController = this.abortController;
    // Abort any in-progress requests
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();

    updateSearchSource(
      searchSource,
      this.searchProps!.dataView,
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

    this.updateOutput({
      ...this.getOutput(),
      loading: true,
      rendered: false,
      error: undefined,
    });

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

    const query = this.savedSearch.searchSource.getField('query');
    const recordRawType = getRawRecordType(query);
    const useSql = recordRawType === RecordRawType.PLAIN;

    try {
      // Request SQL data
      if (useSql && query) {
        const result = await fetchSql(
          this.savedSearch.searchSource.getField('query')!,
          this.services.dataViews,
          this.services.data,
          this.services.expressions,
          this.input.filters,
          this.input.query
        );
        this.updateOutput({
          ...this.getOutput(),
          loading: false,
        });

        this.searchProps!.rows = result;
        this.searchProps!.totalHitCount = result.length;
        this.searchProps!.isLoading = false;
        this.searchProps!.isPlainRecord = true;
        this.searchProps!.showTimeCol = false;
        this.searchProps!.isSortEnabled = false;
        return;
      }

      // Request document data
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

      this.updateOutput({
        ...this.getOutput(),
        loading: false,
      });

      this.searchProps!.rows = resp.hits.hits.map((hit) =>
        buildDataTableRecord(hit as EsHitRecord, this.searchProps!.dataView)
      );
      this.searchProps!.totalHitCount = resp.hits.total as number;
      this.searchProps!.isLoading = false;
    } catch (error) {
      const cancelled = !!prevAbortController?.signal.aborted;
      if (!this.destroyed && !cancelled) {
        this.updateOutput({
          ...this.getOutput(),
          loading: false,
          error,
        });

        this.searchProps!.isLoading = false;
      }
    }
  };

  private getSort(sort: SortPair[] | undefined, dataView?: DataView) {
    return getSortForEmbeddable(sort, dataView, this.services.uiSettings);
  }

  private initializeSearchEmbeddableProps() {
    const { searchSource } = this.savedSearch;

    const dataView = searchSource.getField('index');

    if (!dataView) {
      return;
    }
    const sort = this.getSort(this.savedSearch.sort, dataView);

    const props: SearchProps = {
      columns: this.savedSearch.columns,
      dataView,
      isLoading: false,
      sort,
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
      onSort: (nextSort: string[][]) => {
        const sortOrderArr: SortOrder[] = [];
        nextSort.forEach((arr) => {
          sortOrderArr.push(arr as SortOrder);
        });
        this.updateInput({ sort: sortOrderArr });
      },
      sampleSize: this.services.uiSettings.get(SAMPLE_SIZE_SETTING),
      onFilter: async (field, value, operator) => {
        let filters = generateFilters(
          this.filterManager,
          // @ts-expect-error
          field,
          value,
          operator,
          dataView
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
      rowsPerPageState: this.input.rowsPerPage || this.savedSearch.rowsPerPage,
      onUpdateRowsPerPage: (rowsPerPage) => {
        this.updateInput({ rowsPerPage });
      },
    };

    const timeRangeSearchSource = searchSource.create();
    timeRangeSearchSource.setField('filter', () => {
      const timeRange = this.getTimeRange();
      if (!this.searchProps || !timeRange) return;
      return this.services.timefilter.createFilter(dataView, timeRange);
    });

    this.filtersSearchSource = searchSource.create();
    this.filtersSearchSource.setParent(timeRangeSearchSource);

    searchSource.setParent(this.filtersSearchSource);

    this.load(props);

    props.isLoading = true;

    if (this.savedSearch.grid) {
      props.settings = this.savedSearch.grid;
    }
  }

  private getTimeRange() {
    return this.input.timeslice !== undefined
      ? {
          from: new Date(this.input.timeslice[0]).toISOString(),
          to: new Date(this.input.timeslice[1]).toISOString(),
          mode: 'absolute' as 'absolute',
        }
      : this.input.timeRange;
  }

  private isFetchRequired(searchProps?: SearchProps) {
    if (!searchProps || !searchProps.dataView) {
      return false;
    }

    return (
      !onlyDisabledFiltersChanged(this.input.filters, this.prevFilters) ||
      !isEqual(this.prevQuery, this.input.query) ||
      !isEqual(this.prevTimeRange, this.getTimeRange()) ||
      !isEqual(this.prevSort, this.input.sort) ||
      this.prevSearchSessionId !== this.input.searchSessionId
    );
  }

  private isRerenderRequired(searchProps?: SearchProps) {
    if (!searchProps) {
      return false;
    }
    return (
      this.input.rowsPerPage !== searchProps.rowsPerPageState ||
      (this.input.columns && !isEqual(this.input.columns, searchProps.columns))
    );
  }

  private async pushContainerStateParamsToProps(
    searchProps: SearchProps,
    { forceFetch = false }: { forceFetch: boolean } = { forceFetch: false }
  ) {
    const isFetchRequired = this.isFetchRequired(searchProps);

    // If there is column or sort data on the panel, that means the original columns or sort settings have
    // been overridden in a dashboard.
    searchProps.columns = handleSourceColumnState(
      { columns: this.input.columns || this.savedSearch.columns },
      this.services.core.uiSettings
    ).columns;
    searchProps.sort = this.getSort(
      this.input.sort || this.savedSearch.sort,
      searchProps?.dataView
    );

    searchProps.sharedItemTitle = this.panelTitle;
    searchProps.rowHeightState = this.input.rowHeight || this.savedSearch.rowHeight;
    searchProps.rowsPerPageState = this.input.rowsPerPage || this.savedSearch.rowsPerPage;
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
      this.prevTimeRange = this.getTimeRange();
      this.prevSearchSessionId = this.input.searchSessionId;
      this.prevSort = this.input.sort;
      this.searchProps = searchProps;
      await this.fetch();
    } else if (this.searchProps && this.node) {
      this.searchProps = searchProps;
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

    this.node = domNode;

    this.renderReactComponent(this.node, this.searchProps!);
  }

  private renderReactComponent(domNode: HTMLElement, searchProps: SearchProps) {
    if (!searchProps) {
      return;
    }

    if (
      this.services.uiSettings.get(SHOW_FIELD_STATISTICS) === true &&
      this.savedSearch.viewMode === VIEW_MODE.AGGREGATED_LEVEL &&
      searchProps.services &&
      searchProps.dataView &&
      Array.isArray(searchProps.columns)
    ) {
      ReactDOM.render(
        <I18nProvider>
          <KibanaThemeProvider theme$={searchProps.services.core.theme.theme$}>
            <KibanaContextProvider services={searchProps.services}>
              <FieldStatisticsTable
                dataView={searchProps.dataView}
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

    this.updateOutput({
      ...this.getOutput(),
      rendered: true,
    });
  }

  private async load(searchProps: SearchProps, forceFetch = false) {
    await this.pushContainerStateParamsToProps(searchProps, { forceFetch });

    if (this.node) {
      this.render(this.node);
    }
  }

  public reload(forceFetch = true) {
    if (this.searchProps) {
      this.load(this.searchProps, forceFetch);
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

  /**
   * @returns Local/panel-level array of filters for Saved Search embeddable
   */
  public async getFilters() {
    return mapAndFlattenFilters(
      (this.savedSearch.searchSource.getFields().filter as Filter[]) ?? []
    );
  }

  /**
   * @returns Local/panel-level query for Saved Search embeddable
   */
  public async getQuery() {
    return this.savedSearch.searchSource.getFields().query;
  }

  public destroy() {
    super.destroy();
    if (this.searchProps) {
      delete this.searchProps;
    }
    if (this.node) {
      unmountComponentAtNode(this.node);
    }
    this.subscription?.unsubscribe();

    if (this.abortController) this.abortController.abort();
  }
}
