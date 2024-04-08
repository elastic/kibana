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
import type { KibanaExecutionContext } from '@kbn/core/public';
import {
  Container,
  Embeddable,
  FilterableEmbeddable,
  ReferenceOrValueEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { Adapters, RequestAdapter } from '@kbn/inspector-plugin/common';
import type {
  SavedSearchAttributeService,
  SearchByReferenceInput,
  SearchByValueInput,
  SortOrder,
} from '@kbn/saved-search-plugin/public';
import {
  APPLY_FILTER_TRIGGER,
  generateFilters,
  mapAndFlattenFilters,
} from '@kbn/data-plugin/public';
import type { ISearchSource } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  DOC_TABLE_LEGACY,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_FIELD_STATISTICS,
  SORT_DEFAULT_ORDER_SETTING,
  buildDataTableRecord,
} from '@kbn/discover-utils';
import { columnActions, getTextBasedColumnsMeta } from '@kbn/unified-data-table';
import { VIEW_MODE, getDefaultRowsPerPage } from '../../common/constants';
import type { ISearchEmbeddable, SearchInput, SearchOutput, SearchProps } from './types';
import type { DiscoverServices } from '../build_services';
import { getSortForEmbeddable, SortPair } from '../utils/sorting';
import { getMaxAllowedSampleSize, getAllowedSampleSize } from '../utils/get_allowed_sample_size';
import { SEARCH_EMBEDDABLE_TYPE, SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from './constants';
import { SavedSearchEmbeddableComponent } from './saved_search_embeddable_component';
import { handleSourceColumnState } from '../utils/state_helpers';
import { updateSearchSource } from './utils/update_search_source';
import { FieldStatisticsTable } from '../application/main/components/field_stats_table';
import { fetchTextBased } from '../application/main/utils/fetch_text_based';
import { isTextBasedQuery } from '../application/main/utils/is_text_based_query';
import { getValidViewMode } from '../application/main/utils/get_valid_view_mode';
import { ADHOC_DATA_VIEW_RENDER_EVENT } from '../constants';
import { getDiscoverLocatorParams } from './get_discover_locator_params';

export interface SearchEmbeddableConfig {
  editable: boolean;
  services: DiscoverServices;
  executeTriggerActions: UiActionsStart['executeTriggerActions'];
}

export class SavedSearchEmbeddable
  extends Embeddable<SearchInput, SearchOutput>
  implements
    ISearchEmbeddable,
    FilterableEmbeddable,
    ReferenceOrValueEmbeddable<SearchByValueInput, SearchByReferenceInput>
{
  public readonly type = SEARCH_EMBEDDABLE_TYPE;
  public readonly deferEmbeddableLoad = true;

  private readonly services: DiscoverServices;
  private readonly executeTriggerActions: UiActionsStart['executeTriggerActions'];
  private readonly attributeService: SavedSearchAttributeService;
  private readonly inspectorAdapters: Adapters;
  private readonly subscription?: Subscription;

  private abortController?: AbortController;
  private savedSearch: SavedSearch | undefined;
  private panelTitleInternal: string = '';
  private filtersSearchSource!: ISearchSource;
  private prevTimeRange?: TimeRange;
  private prevFilters?: Filter[];
  private prevQuery?: Query;
  private prevSort?: SortOrder[];
  private prevSearchSessionId?: string;
  private prevSampleSizeInput?: number;
  private searchProps?: SearchProps;
  private initialized?: boolean;
  private node?: HTMLElement;

  constructor(
    { editable, services, executeTriggerActions }: SearchEmbeddableConfig,
    initialInput: SearchInput,
    parent?: Container
  ) {
    super(initialInput, { editApp: 'discover', editable }, parent);

    this.services = services;
    this.executeTriggerActions = executeTriggerActions;
    this.attributeService = services.savedSearch.byValue.attributeService;
    this.inspectorAdapters = {
      requests: new RequestAdapter(),
    };

    this.subscription = this.getUpdated$().subscribe(() => {
      const titleChanged = this.output.title && this.panelTitleInternal !== this.output.title;
      if (titleChanged) {
        this.panelTitleInternal = this.output.title || '';
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

    this.initializeSavedSearch(initialInput).then(() => {
      this.initializeSearchEmbeddableProps();
    });
  }

  private getCurrentTitle() {
    return this.input.hidePanelTitles ? '' : this.input.title ?? this.savedSearch?.title ?? '';
  }

  private async initializeSavedSearch(input: SearchInput) {
    try {
      const unwrapResult = await this.attributeService.unwrapAttributes(input);

      if (this.destroyed) {
        return;
      }

      this.savedSearch = await this.services.savedSearch.byValue.toSavedSearch(
        (input as SearchByReferenceInput)?.savedObjectId,
        unwrapResult
      );

      this.panelTitleInternal = this.getCurrentTitle();

      await this.initializeOutput();

      // deferred loading of this embeddable is complete
      this.setInitializationFinished();

      this.initialized = true;
    } catch (e) {
      this.onFatalError(e);
    }
  }

  private async initializeOutput() {
    const savedSearch = this.savedSearch;

    if (!savedSearch) {
      return;
    }

    const dataView = savedSearch.searchSource.getField('index');
    const indexPatterns = dataView ? [dataView] : [];
    const input = this.getInput();
    const title = this.getCurrentTitle();
    const description = input.hidePanelTitles ? '' : input.description ?? savedSearch.description;
    const savedObjectId = (input as SearchByReferenceInput).savedObjectId;
    const locatorParams = getDiscoverLocatorParams(this);
    // We need to use a redirect URL if this is a by value saved search using
    // an ad hoc data view to ensure the data view spec gets encoded in the URL
    const useRedirect = !savedObjectId && !dataView?.isPersisted();
    const editUrl = useRedirect
      ? this.services.locator.getRedirectUrl(locatorParams)
      : await this.services.locator.getUrl(locatorParams);
    const editPath = this.services.core.http.basePath.remove(editUrl);
    const editApp = useRedirect ? 'r' : 'discover';

    this.updateOutput({
      ...this.getOutput(),
      defaultTitle: savedSearch.title,
      defaultDescription: savedSearch.description,
      title,
      description,
      editApp,
      editPath,
      editUrl,
      indexPatterns,
    });
  }

  public inputIsRefType(
    input: SearchByValueInput | SearchByReferenceInput
  ): input is SearchByReferenceInput {
    return this.attributeService.inputIsRefType(input);
  }

  public async getInputAsValueType() {
    return this.attributeService.getInputAsValueType(this.getExplicitInput());
  }

  public async getInputAsRefType() {
    return this.attributeService.getInputAsRefType(this.getExplicitInput(), {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  }

  public reportsEmbeddableLoad() {
    return true;
  }

  private isTextBasedSearch = (savedSearch: SavedSearch): boolean => {
    const query = savedSearch.searchSource.getField('query');
    return isTextBasedQuery(query);
  };

  private getFetchedSampleSize = (searchProps: SearchProps): number => {
    return getAllowedSampleSize(searchProps.sampleSizeState, this.services.uiSettings);
  };

  private fetch = async () => {
    const savedSearch = this.savedSearch;
    const searchProps = this.searchProps;

    if (!savedSearch || !searchProps) {
      return;
    }

    const searchSessionId = this.input.searchSessionId;
    const useNewFieldsApi = !this.services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE, false);
    const currentAbortController = new AbortController();

    // Abort any in-progress requests
    this.abortController?.abort();
    this.abortController = currentAbortController;

    updateSearchSource(
      savedSearch.searchSource,
      searchProps.dataView,
      searchProps.sort,
      this.getFetchedSampleSize(searchProps),
      useNewFieldsApi,
      {
        sortDir: this.services.uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
      }
    );

    // Log request to inspector
    this.inspectorAdapters.requests!.reset();

    searchProps.isLoading = true;
    searchProps.interceptedWarnings = undefined;

    const wasAlreadyRendered = this.getOutput().rendered;

    this.updateOutput({
      ...this.getOutput(),
      loading: true,
      rendered: false,
      error: undefined,
    });

    if (wasAlreadyRendered && this.node) {
      // to show a loading indicator during a refetch, we need to rerender here
      this.render(this.node);
    }

    const parentContext = this.input.executionContext;
    const child: KibanaExecutionContext = {
      type: this.type,
      name: 'discover',
      id: savedSearch.id,
      description: this.output.title || this.output.defaultTitle || '',
      url: this.output.editUrl,
    };
    const executionContext = parentContext
      ? {
          ...parentContext,
          child,
        }
      : child;

    const query = savedSearch.searchSource.getField('query');
    const dataView = savedSearch.searchSource.getField('index')!;
    const useTextBased = this.isTextBasedSearch(savedSearch);

    try {
      // Request text based data
      if (useTextBased && query) {
        const result = await fetchTextBased(
          savedSearch.searchSource.getField('query')!,
          dataView,
          this.services.data,
          this.services.expressions,
          this.services.inspector,
          this.abortController.signal,
          this.input.filters,
          this.input.query
        );

        this.updateOutput({
          ...this.getOutput(),
          loading: false,
        });

        searchProps.columnsMeta = result.textBasedQueryColumns
          ? getTextBasedColumnsMeta(result.textBasedQueryColumns)
          : undefined;
        searchProps.rows = result.records;
        searchProps.totalHitCount = result.records.length;
        searchProps.isLoading = false;
        searchProps.isPlainRecord = true;
        searchProps.isSortEnabled = true;

        return;
      }

      // Request document data
      const { rawResponse: resp } = await lastValueFrom(
        savedSearch.searchSource.fetch$({
          abortSignal: currentAbortController.signal,
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
          disableWarningToasts: true,
        })
      );

      if (this.inspectorAdapters.requests) {
        const interceptedWarnings: SearchResponseWarning[] = [];
        this.services.data.search.showWarnings(this.inspectorAdapters.requests, (warning) => {
          interceptedWarnings.push(warning);
          return true; // suppress the default behaviour
        });
        searchProps.interceptedWarnings = interceptedWarnings;
      }

      this.updateOutput({
        ...this.getOutput(),
        loading: false,
      });

      searchProps.rows = resp.hits.hits.map((hit) =>
        buildDataTableRecord(hit as EsHitRecord, searchProps.dataView)
      );
      searchProps.totalHitCount = resp.hits.total as number;
      searchProps.isLoading = false;
    } catch (error) {
      const cancelled = !!currentAbortController?.signal.aborted;

      if (!this.destroyed && !cancelled) {
        this.updateOutput({
          ...this.getOutput(),
          loading: false,
          error,
        });

        searchProps.isLoading = false;
      }
    }
  };

  private getSort(
    sort: SortPair[] | undefined,
    dataView: DataView | undefined,
    isTextBased: boolean
  ) {
    return getSortForEmbeddable(sort, dataView, this.services.uiSettings, isTextBased);
  }

  private initializeSearchEmbeddableProps() {
    const savedSearch = this.savedSearch;

    if (!savedSearch) {
      return;
    }

    const dataView = savedSearch.searchSource.getField('index');

    if (!dataView) {
      return;
    }

    if (!dataView.isPersisted()) {
      // one used adhoc data view
      this.services.trackUiMetric?.(METRIC_TYPE.COUNT, ADHOC_DATA_VIEW_RENDER_EVENT);
    }

    const props: SearchProps = {
      columns: savedSearch.columns || [],
      savedSearchId: savedSearch.id,
      filters: savedSearch.searchSource.getField('filter') as Filter[],
      dataView,
      isLoading: false,
      sort: this.getSort(savedSearch.sort, dataView, this.isTextBasedSearch(savedSearch)),
      rows: [],
      searchDescription: savedSearch.description,
      description: savedSearch.description,
      inspectorAdapters: this.inspectorAdapters,
      searchTitle: savedSearch.title,
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
      onFilter: async (field, value, operator) => {
        let filters = generateFilters(
          this.services.filterManager,
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
      rowHeightState: this.input.rowHeight || savedSearch.rowHeight,
      onUpdateRowHeight: (rowHeight) => {
        this.updateInput({ rowHeight });
      },
      headerRowHeightState: this.input.headerRowHeight || savedSearch.headerRowHeight,
      onUpdateHeaderRowHeight: (headerRowHeight) => {
        this.updateInput({ headerRowHeight });
      },
      rowsPerPageState: this.input.rowsPerPage || savedSearch.rowsPerPage,
      onUpdateRowsPerPage: (rowsPerPage) => {
        this.updateInput({ rowsPerPage });
      },
      sampleSizeState: this.input.sampleSize || savedSearch.sampleSize,
      onUpdateSampleSize: (sampleSize) => {
        this.updateInput({ sampleSize });
      },
      cellActionsTriggerId: SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID,
    };

    const timeRangeSearchSource = savedSearch.searchSource.create();

    timeRangeSearchSource.setField('filter', () => {
      const timeRange = this.getTimeRange();
      if (!this.searchProps || !timeRange) return;
      return this.services.timefilter.createFilter(dataView, timeRange);
    });

    this.filtersSearchSource = savedSearch.searchSource.create();

    this.filtersSearchSource.setParent(timeRangeSearchSource);
    savedSearch.searchSource.setParent(this.filtersSearchSource);

    this.load(props);

    props.isLoading = true;

    if (savedSearch.grid) {
      props.settings = savedSearch.grid;
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
      this.prevSampleSizeInput !== this.input.sampleSize ||
      this.prevSearchSessionId !== this.input.searchSessionId
    );
  }

  private isRerenderRequired(searchProps?: SearchProps) {
    if (!searchProps) {
      return false;
    }
    return (
      this.input.rowsPerPage !== searchProps.rowsPerPageState ||
      this.input.sampleSize !== searchProps.sampleSizeState ||
      (this.input.columns && !isEqual(this.input.columns, searchProps.columns))
    );
  }

  private async pushContainerStateParamsToProps(
    searchProps: SearchProps,
    { forceFetch = false }: { forceFetch: boolean } = { forceFetch: false }
  ) {
    const savedSearch = this.savedSearch;

    if (!savedSearch) {
      return;
    }

    const isFetchRequired = this.isFetchRequired(searchProps);

    // If there is column or sort data on the panel, that means the original
    // columns or sort settings have been overridden in a dashboard.
    const columnState = handleSourceColumnState(
      { columns: this.input.columns || savedSearch.columns },
      this.services.core.uiSettings
    );

    searchProps.columns = columnState.columns || [];
    searchProps.sort = this.getSort(
      this.input.sort || savedSearch.sort,
      searchProps?.dataView,
      this.isTextBasedSearch(savedSearch)
    );
    searchProps.sharedItemTitle = this.panelTitleInternal;
    searchProps.searchTitle = this.panelTitleInternal;
    searchProps.rowHeightState = this.input.rowHeight ?? savedSearch.rowHeight;
    searchProps.headerRowHeightState = this.input.headerRowHeight ?? savedSearch.headerRowHeight;
    searchProps.rowsPerPageState =
      this.input.rowsPerPage ||
      savedSearch.rowsPerPage ||
      getDefaultRowsPerPage(this.services.uiSettings);
    searchProps.maxAllowedSampleSize = getMaxAllowedSampleSize(this.services.uiSettings);
    searchProps.sampleSizeState = this.input.sampleSize || savedSearch.sampleSize;
    searchProps.filters = savedSearch.searchSource.getField('filter') as Filter[];
    searchProps.savedSearchId = savedSearch.id;

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
      this.prevSampleSizeInput = this.input.sampleSize;
      this.searchProps = searchProps;

      await this.fetch();
    } else if (this.searchProps && this.node) {
      this.searchProps = searchProps;
    }
  }

  public async render(domNode: HTMLElement) {
    this.node = domNode;

    if (!this.searchProps || !this.initialized || this.destroyed) {
      return;
    }

    super.render(domNode);
    this.renderReactComponent(this.node, this.searchProps!);
  }

  private renderReactComponent(domNode: HTMLElement, searchProps: SearchProps) {
    const savedSearch = this.savedSearch;

    if (!searchProps || !savedSearch) {
      return;
    }

    const viewMode = getValidViewMode({
      viewMode: savedSearch.viewMode,
      isTextBasedQueryMode: this.isTextBasedSearch(savedSearch),
    });

    if (
      this.services.uiSettings.get(SHOW_FIELD_STATISTICS) === true &&
      viewMode === VIEW_MODE.AGGREGATED_LEVEL &&
      searchProps.services &&
      searchProps.dataView &&
      Array.isArray(searchProps.columns)
    ) {
      ReactDOM.render(
        <KibanaRenderContextProvider
          theme={searchProps.services.core.theme}
          i18n={searchProps.services.core.i18n}
        >
          <KibanaContextProvider services={searchProps.services}>
            <FieldStatisticsTable
              dataView={searchProps.dataView}
              columns={searchProps.columns}
              savedSearch={savedSearch}
              filters={this.input.filters}
              query={this.input.query}
              onAddFilter={searchProps.onFilter}
              searchSessionId={this.input.searchSessionId}
            />
          </KibanaContextProvider>
        </KibanaRenderContextProvider>,
        domNode
      );

      this.updateOutput({
        ...this.getOutput(),
        rendered: true,
      });

      return;
    }

    const useLegacyTable = this.services.uiSettings.get(DOC_TABLE_LEGACY);
    const query = savedSearch.searchSource.getField('query');
    const props = {
      savedSearch,
      searchProps,
      useLegacyTable,
      query,
    };

    if (searchProps.services) {
      const { getTriggerCompatibleActions } = searchProps.services.uiActions;

      ReactDOM.render(
        <KibanaRenderContextProvider
          theme={searchProps.services.core.theme}
          i18n={searchProps.services.core.i18n}
        >
          <KibanaContextProvider services={searchProps.services}>
            <CellActionsProvider getTriggerCompatibleActions={getTriggerCompatibleActions}>
              <SavedSearchEmbeddableComponent
                {...props}
                fetchedSampleSize={this.getFetchedSampleSize(props.searchProps)}
              />
            </CellActionsProvider>
          </KibanaContextProvider>
        </KibanaRenderContextProvider>,
        domNode
      );

      const hasError = this.getOutput().error !== undefined;

      if (this.searchProps!.isLoading === false && props.searchProps.rows !== undefined) {
        this.renderComplete.dispatchComplete();
        this.updateOutput({
          ...this.getOutput(),
          rendered: true,
        });
      } else if (hasError) {
        this.renderComplete.dispatchError();
        this.updateOutput({
          ...this.getOutput(),
          rendered: true,
        });
      }
    }
  }

  private async load(searchProps: SearchProps, forceFetch = false) {
    await this.pushContainerStateParamsToProps(searchProps, { forceFetch });

    if (this.node) {
      this.render(this.node);
    }
  }

  public reload(forceFetch = true) {
    if (this.searchProps && this.initialized && !this.destroyed) {
      this.load(this.searchProps, forceFetch);
    }
  }

  public getSavedSearch(): SavedSearch | undefined {
    return this.savedSearch;
  }

  public getInspectorAdapters() {
    return this.inspectorAdapters;
  }

  /**
   * @returns Local/panel-level array of filters for Saved Search embeddable
   */
  public getFilters() {
    return mapAndFlattenFilters(
      (this.savedSearch?.searchSource.getFields().filter as Filter[]) ?? []
    );
  }

  /**
   * @returns Local/panel-level query for Saved Search embeddable
   */
  public getQuery() {
    return this.savedSearch?.searchSource.getFields().query;
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
    this.abortController?.abort();
  }

  public hasTimeRange() {
    return this.getTimeRange() !== undefined;
  }
}
