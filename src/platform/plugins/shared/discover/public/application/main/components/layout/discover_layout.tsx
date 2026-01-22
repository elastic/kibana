/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiProgress,
  EuiDelayRender,
  useEuiBreakpoint,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { appendWhereClauseToESQLQuery, hasTransformationalCommand } from '@kbn/esql-utils';
import { METRIC_TYPE } from '@kbn/analytics';
import { generateFilters } from '@kbn/data-plugin/public';
import { useDragDropContext } from '@kbn/dom-drag-drop';
import { type DataView, type DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import { SHOW_FIELD_STATISTICS, SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import type { UseColumnsProps } from '@kbn/unified-data-table';
import { popularizeField, useColumns } from '@kbn/unified-data-table';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { BehaviorSubject } from 'rxjs';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { VIEW_MODE } from '../../../../../common/constants';
import { useAppStateSelector } from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverNoResults } from '../no_results';
import { LoadingSpinner } from '../loading_spinner/loading_spinner';
import { DiscoverSidebarResponsive } from '../sidebar';
import type { DiscoverTopNavProps } from '../top_nav/discover_topnav';
import { DiscoverTopNav } from '../top_nav/discover_topnav';
import { getResultState } from '../../utils/get_result_state';
import { DiscoverUninitialized } from '../uninitialized/uninitialized';
import type { DataMainMsg } from '../../state_management/discover_data_state_container';
import type { SidebarToggleState } from '../../../types';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import { SavedSearchURLConflictCallout } from '../../../../components/saved_search_url_conflict_callout/saved_search_url_conflict_callout';
import { ErrorCallout } from '../../../../components/common/error_callout';
import { addLog } from '../../../../utils/add_log';
import { DiscoverResizableLayout } from './discover_resizable_layout';
import type { PanelsToggleProps } from '../../../../components/panels_toggle';
import { PanelsToggle } from '../../../../components/panels_toggle';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { DiscoverHistogramLayout } from './discover_histogram_layout';
import type { DiscoverLayoutRestorableState } from './discover_layout_restorable_state';
import { useScopedServices } from '../../../../components/scoped_services_provider';

const queryClient = new QueryClient();
const SidebarMemoized = React.memo(DiscoverSidebarResponsive);

const TopNavMemoized = React.memo((props: DiscoverTopNavProps) => (
  // QueryClientProvider is used to allow querying the authorized rules api hook
  <QueryClientProvider client={queryClient}>
    <DiscoverTopNav {...props} />
  </QueryClientProvider>
));

export interface DiscoverLayoutProps {
  stateContainer: DiscoverStateContainer;
}

export function DiscoverLayout({ stateContainer }: DiscoverLayoutProps) {
  const {
    trackUiMetric,
    capabilities,
    dataViews,
    data,
    uiSettings,
    filterManager,
    history,
    spaces,
    observabilityAIAssistant,
    dataVisualizer: dataVisualizerService,
    fieldsMetadata,
  } = useDiscoverServices();
  const { scopedEBTManager } = useScopedServices();
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const styles = useMemoCss(componentStyles);
  const globalQueryState = data.query.getState();
  const { main$ } = stateContainer.dataState.data$;
  const [query, savedQuery, columns, sort, grid] = useAppStateSelector((state) => [
    state.query,
    state.savedQuery,
    state.columns,
    state.sort,
    state.grid,
  ]);
  const isEsqlMode = useIsEsqlMode();
  const viewMode: VIEW_MODE = useAppStateSelector((state) => {
    const fieldStatsNotAvailable =
      !uiSettings.get(SHOW_FIELD_STATISTICS) && !!dataVisualizerService;
    if (state.viewMode === VIEW_MODE.AGGREGATED_LEVEL && fieldStatsNotAvailable) {
      return VIEW_MODE.DOCUMENT_LEVEL;
    }
    return state.viewMode ?? VIEW_MODE.DOCUMENT_LEVEL;
  });
  const dataView = useCurrentDataView();
  const dataViewLoading = useCurrentTabSelector((state) => state.isDataViewLoading);
  const dataState: DataMainMsg = useDataState(main$);
  const discoverSession = useInternalStateSelector((state) => state.persistedDiscoverSession);

  const fetchCounter = useRef<number>(0);

  useEffect(() => {
    if (dataState.fetchStatus === FetchStatus.LOADING) {
      fetchCounter.current++;
    }
  }, [dataState.fetchStatus]);

  // We treat rollup v1 data views as non time based in Discover, since we query them
  // in a non time based way using the regular _search API, since the internal
  // representation of those documents does not have the time field that _field_caps
  // reports us.
  const isTimeBased = useMemo(() => {
    return dataView.type !== DataViewType.ROLLUP && dataView.isTimeBased();
  }, [dataView]);

  const resultState = useMemo(
    () => getResultState(dataState.fetchStatus, dataState.foundDocuments ?? false),
    [dataState.fetchStatus, dataState.foundDocuments]
  );

  const setAppState = useCallback<UseColumnsProps['setAppState']>(
    ({ settings, ...rest }) => {
      dispatch(updateAppState({ appState: { ...rest, grid: settings as DiscoverGridSettings } }));
    },
    [dispatch, updateAppState]
  );

  const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState,
    columns,
    sort,
    settings: grid,
  });

  const onAddColumnWithTracking = useCallback(
    (columnName: string) => {
      onAddColumn(columnName);
      void scopedEBTManager.trackDataTableSelection({ fieldName: columnName, fieldsMetadata });
    },
    [onAddColumn, scopedEBTManager, fieldsMetadata]
  );

  const onRemoveColumnWithTracking = useCallback(
    (columnName: string) => {
      onRemoveColumn(columnName);
      void scopedEBTManager.trackDataTableRemoval({ fieldName: columnName, fieldsMetadata });
    },
    [onRemoveColumn, scopedEBTManager, fieldsMetadata]
  );

  // The assistant is getting the state from the url correctly
  // expect from the index pattern where we have only the dataview id
  useEffect(() => {
    return observabilityAIAssistant?.service.setScreenContext({
      screenDescription: `The user is looking at the Discover view on the ${
        isEsqlMode ? 'ES|QL' : 'dataView'
      } mode. The index pattern is the ${dataView.getIndexPattern()}`,
    });
  }, [dataView, isEsqlMode, observabilityAIAssistant?.service]);

  const onAddFilter = useCallback<DocViewFilterFn>(
    (field, values, operation) => {
      if (!field) {
        return;
      }
      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(dataView, fieldName, dataViews, capabilities);
      const newFilters = generateFilters(filterManager, field, values, operation, dataView);
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
      }
      void scopedEBTManager.trackFilterAddition({
        fieldName: fieldName === '_exists_' ? String(values) : fieldName,
        filterOperation: fieldName === '_exists_' ? '_exists_' : operation,
        fieldsMetadata,
      });
      return filterManager.addFilters(newFilters);
    },
    [
      dataView,
      dataViews,
      capabilities,
      filterManager,
      trackUiMetric,
      scopedEBTManager,
      fieldsMetadata,
    ]
  );

  const onPopulateWhereClause = useCallback<DocViewFilterFn>(
    (field, values, operation) => {
      if (!field || !isOfAggregateQueryType(query)) {
        return;
      }
      const fieldName = typeof field === 'string' ? field : field.name;
      // send the field type for casting
      const fieldType = typeof field !== 'string' ? field.type : undefined;
      // weird existence logic from Discover components
      // in the field it comes the operator _exists_ and in the value the field
      // I need to take care of it here but I think it should be handled on the fieldlist instead
      const updatedQuery = appendWhereClauseToESQLQuery(
        query.esql,
        fieldName === '_exists_' ? String(values) : fieldName,
        fieldName === '_exists_' || values == null ? undefined : values,
        getOperator(fieldName, values, operation),
        fieldType
      );
      if (!updatedQuery) {
        return;
      }
      data.query.queryString.setQuery({
        esql: updatedQuery,
      });
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'esql_filter_added');
      }
      void scopedEBTManager.trackFilterAddition({
        fieldName: fieldName === '_exists_' ? String(values) : fieldName,
        filterOperation: fieldName === '_exists_' ? '_exists_' : operation,
        fieldsMetadata,
      });
    },
    [query, data.query.queryString, trackUiMetric, scopedEBTManager, fieldsMetadata]
  );

  const onFilter = isEsqlMode ? onPopulateWhereClause : onAddFilter;

  const canSetBreakdownField = useMemo(
    () =>
      isOfAggregateQueryType(query)
        ? dataView?.isTimeBased() && !hasTransformationalCommand(query.esql)
        : true,
    [dataView, query]
  );

  const onAddBreakdownField = useCallback(
    (field: DataViewField | undefined) => {
      dispatch(updateAppState({ appState: { breakdownField: field?.name } }));
    },
    [dispatch, updateAppState]
  );

  const onFieldEdited: (options: {
    editedDataView: DataView;
    removedFieldName?: string;
  }) => Promise<void> = useCallback(
    async (options) => {
      const { editedDataView, removedFieldName } = options || {
        editedDataView: dataView,
      };
      if (removedFieldName && currentColumns.includes(removedFieldName)) {
        onRemoveColumn(removedFieldName);
      }
      if (!editedDataView.isPersisted()) {
        await stateContainer.actions.updateAdHocDataViewId(editedDataView);
      }
      if (editedDataView?.id) {
        // `tab.uiState.fieldListExistingFieldsInfo` needs to be reset when user edits fields,
        // otherwise the edited field would be shown under "Empty" section in the sidebar
        // when switching to a tab with the same data view id.
        dispatch(
          internalStateActions.resetAffectedFieldListExistingFieldsInfoUiState({
            dataViewId: editedDataView.id,
          })
        );
      }
      stateContainer.dataState.refetch$.next('reset');
    },
    [dataView, stateContainer, currentColumns, onRemoveColumn, dispatch]
  );

  const onDisableFilters = useCallback(() => {
    const disabledFilters = filterManager
      .getFilters()
      .map((filter) => ({ ...filter, meta: { ...filter.meta, disabled: true } }));
    filterManager.setFilters(disabledFilters);
  }, [filterManager]);

  const contentCentered = resultState === 'uninitialized' || resultState === 'none';
  const documentState = useDataState(stateContainer.dataState.data$.documents$);

  const esqlModeWarning = useMemo(() => {
    if (isEsqlMode) {
      return documentState.esqlHeaderWarning;
    }
  }, [documentState.esqlHeaderWarning, isEsqlMode]);

  const esqlModeErrors = useMemo(() => {
    if (isEsqlMode) {
      return dataState.error;
    }
  }, [dataState.error, isEsqlMode]);

  const [{ dragging }] = useDragDropContext();
  const draggingFieldName = dragging?.id;

  const onDropFieldToTable = useMemo(() => {
    if (!draggingFieldName || currentColumns.includes(draggingFieldName)) {
      return undefined;
    }

    return () => onAddColumnWithTracking(draggingFieldName);
  }, [onAddColumnWithTracking, draggingFieldName, currentColumns]);

  const [sidebarToggleState$] = useState<BehaviorSubject<SidebarToggleState>>(
    () => new BehaviorSubject<SidebarToggleState>({ isCollapsed: false, toggle: () => {} })
  );

  const panelsToggle: ReactElement<PanelsToggleProps> = useMemo(() => {
    return (
      <PanelsToggle
        stateContainer={stateContainer}
        sidebarToggleState$={sidebarToggleState$}
        renderedFor="root"
        isChartAvailable={undefined}
      />
    );
  }, [stateContainer, sidebarToggleState$]);

  const mainDisplay = useMemo(() => {
    if (resultState === 'uninitialized') {
      addLog('[DiscoverLayout] uninitialized triggers data fetching');
      return <DiscoverUninitialized onRefresh={() => stateContainer.dataState.fetch()} />;
    }

    return (
      <>
        <DiscoverHistogramLayout
          dataView={dataView}
          stateContainer={stateContainer}
          columns={currentColumns}
          viewMode={viewMode}
          onAddFilter={onFilter}
          onFieldEdited={onFieldEdited}
          onDropFieldToTable={onDropFieldToTable}
          panelsToggle={panelsToggle}
        />
        {resultState === 'loading' && <LoadingSpinner />}
      </>
    );
  }, [
    resultState,
    dataView,
    stateContainer,
    currentColumns,
    viewMode,
    onFilter,
    onFieldEdited,
    onDropFieldToTable,
    panelsToggle,
  ]);

  const isLoading =
    documentState.fetchStatus === FetchStatus.LOADING ||
    documentState.fetchStatus === FetchStatus.PARTIAL;

  const onCancelClick = useCallback(() => {
    stateContainer.dataState.cancel();
  }, [stateContainer.dataState]);

  const layoutUiState = useCurrentTabSelector((state) => state.uiState.layout);
  const setLayoutUiState = useCurrentTabAction(internalStateActions.setLayoutUiState);
  const onInitialStateChange = useCallback(
    (newLayoutUiState: Partial<DiscoverLayoutRestorableState>) => {
      dispatch(
        setLayoutUiState({
          layoutUiState: newLayoutUiState,
        })
      );
    },
    [dispatch, setLayoutUiState]
  );

  return (
    <EuiPage
      className="dscPage" // class is used in tests and other styles
      data-fetch-counter={fetchCounter.current}
      direction="column"
      css={[
        styles.dscPage,
        css`
          ${useEuiBreakpoint(['m', 'l', 'xl'])} {
            ${kbnFullBodyHeightCss('40px')}
          }
        `,
      ]}
    >
      <TopNavMemoized
        savedQuery={savedQuery}
        stateContainer={stateContainer}
        esqlModeErrors={esqlModeErrors}
        esqlModeWarning={esqlModeWarning}
        onFieldEdited={onFieldEdited}
        isLoading={isLoading}
        onCancelClick={onCancelClick}
      />
      <EuiPageBody css={styles.pageBody}>
        <div css={styles.sidebarContainer}>
          {dataViewLoading && (
            <EuiDelayRender delay={300}>
              <EuiProgress size="xs" color="accent" position="absolute" />
            </EuiDelayRender>
          )}
          <SavedSearchURLConflictCallout
            discoverSession={discoverSession}
            spaces={spaces}
            history={history}
          />
          <DiscoverResizableLayout
            sidebarToggleState$={sidebarToggleState$}
            sidebarPanel={
              <SidebarMemoized
                columns={currentColumns}
                documents$={stateContainer.dataState.data$.documents$}
                onAddBreakdownField={canSetBreakdownField ? onAddBreakdownField : undefined}
                onAddField={onAddColumnWithTracking}
                onAddFilter={onFilter}
                onChangeDataView={stateContainer.actions.onChangeDataView}
                onDataViewCreated={stateContainer.actions.onDataViewCreated}
                onFieldEdited={onFieldEdited}
                onRemoveField={onRemoveColumnWithTracking}
                selectedDataView={dataView}
                sidebarToggleState$={sidebarToggleState$}
                trackUiMetric={trackUiMetric}
              />
            }
            mainPanel={
              <div css={styles.dscPageContentWrapper}>
                {resultState === 'none' ? (
                  <>
                    {React.isValidElement(panelsToggle) ? (
                      <div css={styles.mainPanel}>
                        {React.cloneElement(panelsToggle, {
                          renderedFor: 'prompt',
                          isChartAvailable: false,
                        })}
                      </div>
                    ) : null}
                    {dataState.error ? (
                      <ErrorCallout
                        title={i18n.translate(
                          'discover.noResults.searchExamples.noResultsErrorTitle',
                          {
                            defaultMessage: 'Unable to retrieve search results',
                          }
                        )}
                        error={dataState.error}
                        isEsqlMode={isEsqlMode}
                      />
                    ) : (
                      <DiscoverNoResults
                        stateContainer={stateContainer}
                        isTimeBased={isTimeBased}
                        query={globalQueryState.query}
                        filters={globalQueryState.filters}
                        dataView={dataView}
                        onDisableFilters={onDisableFilters}
                      />
                    )}
                  </>
                ) : (
                  <EuiPanel
                    role="main"
                    paddingSize="none"
                    borderRadius="none"
                    hasShadow={false}
                    hasBorder={false}
                    color="transparent"
                    css={[styles.dscPageContent, contentCentered && styles.dscPageContentCentered]}
                  >
                    {mainDisplay}
                  </EuiPanel>
                )}
              </div>
            }
            initialState={layoutUiState}
            onInitialStateChange={onInitialStateChange}
          />
        </div>
      </EuiPageBody>
    </EuiPage>
  );
}

const getOperator = (fieldName: string, values: unknown, operation: '+' | '-') => {
  if (fieldName === '_exists_') {
    return 'is_not_null';
  }
  if (values == null && operation === '-') {
    return 'is_not_null';
  }

  if (values == null && operation === '+') {
    return 'is_null';
  }

  return operation;
};

const componentStyles = {
  dscPage: ({ euiTheme }: UseEuiTheme) =>
    css({
      overflow: 'visible',
      padding: 0,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
  pageBody: css({
    overflow: 'hidden',
  }),
  sidebarContainer: css({
    width: '100%',
    height: '100%',
  }),
  mainPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
    }),
  dscPageContentWrapper: css({
    overflow: 'hidden', // Ensures horizontal scroll of table
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }),
  dscPageContent: css({
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
  }),
  dscPageContentCentered: css({
    width: 'auto',
    height: 'auto',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    flexGrow: 0,
  }),
};
