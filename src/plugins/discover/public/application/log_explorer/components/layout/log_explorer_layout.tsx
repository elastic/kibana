/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import '../../../main/components/layout/discover_layout.scss';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isOfQueryType } from '@kbn/es-query';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHideFor,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import classNames from 'classnames';
import { generateFilters } from '@kbn/data-plugin/public';
import { DataView, DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import { InspectorSession } from '@kbn/inspector-plugin/public';
import { useActor } from '@xstate/react';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverNoResults } from '../../../main/components/no_results';
import { LoadingSpinner } from '../../../main/components/loading_spinner/loading_spinner';
import { DiscoverSidebarResponsive } from '../../../main/components/sidebar';
import { DiscoverLayoutProps } from '../../../main/components/layout/types';
import { SEARCH_FIELDS_FROM_SOURCE } from '../../../../../common';
import { popularizeField } from '../../../../utils/popularize_field';
import { DiscoverTopNav } from '../../../main/components/top_nav/discover_topnav';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { DiscoverUninitialized } from '../../../main/components/uninitialized/uninitialized';
import { DataMainMsg } from '../../../main/hooks/use_saved_search';
import { useColumns } from '../../../../hooks/use_data_grid_columns';
import { useDataState } from '../../../main/hooks/use_data_state';
import { SavedSearchURLConflictCallout } from '../../../../services/saved_searches';
import { hasActiveFilter } from '../../../main/components/layout/utils';
import { LogExplorer } from './log_explorer';
import { useStateMachineContext } from '../../hooks/query_data/use_state_machine';
import { RecordRawType } from '../../../main/hooks/use_saved_search';
import { getRawRecordType } from '../../../main/utils/get_raw_record_type';
import { useFieldCounts } from '../../hooks/use_field_counts';

/**
 * Local storage key for sidebar persistence state
 */
export const SIDEBAR_CLOSED_KEY = 'discover:sidebarClosed';

const SidebarMemoized = React.memo(DiscoverSidebarResponsive);
const TopNavMemoized = React.memo(DiscoverTopNav);

export function LogExplorerLayout({
  dataView,
  dataViewList,
  inspectorAdapters,
  expandedDoc,
  navigateTo,
  onChangeDataView,
  onUpdateQuery,
  setExpandedDoc,
  savedSearchRefetch$,
  resetSavedSearch,
  savedSearchData$,
  savedSearch,
  searchSource,
  state,
  stateContainer,
}: DiscoverLayoutProps) {
  const {
    trackUiMetric,
    capabilities,
    dataViews,
    data,
    uiSettings,
    filterManager,
    storage,
    history,
    spaces,
    inspector,
  } = useDiscoverServices();
  const { main$ } = savedSearchData$;
  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const stateMachine = useStateMachineContext();
  const [dataAccessState] = useActor(stateMachine);
  const fieldCounts = useFieldCounts(stateMachine);
  const dataState: DataMainMsg = useDataState(main$);

  // We treat rollup v1 data views as non time based in Discover, since we query them
  // in a non time based way using the regular _search API, since the internal
  // representation of those documents does not have the time field that _field_caps
  // reports us.
  const isTimeBased = useMemo(() => {
    return dataView.type !== DataViewType.ROLLUP && dataView.isTimeBased();
  }, [dataView]);

  const initialSidebarClosed = Boolean(storage.get(SIDEBAR_CLOSED_KEY));
  const [isSidebarClosed, setIsSidebarClosed] = useState(initialSidebarClosed);
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  const isPlainRecord = useMemo(
    () => getRawRecordType(state.query) === RecordRawType.PLAIN,
    [state.query]
  );

  const textBasedLanguageModeErrors = useMemo(() => {
    if (isPlainRecord) {
      return dataState.error;
    }
  }, [dataState.error, isPlainRecord]);

  // const resultState = useMemo(
  //   () => getResultState(dataState.fetchStatus, dataState.foundDocuments!),
  //   [dataState.fetchStatus, dataState.foundDocuments]
  // );

  const onOpenInspector = useCallback(() => {
    // prevent overlapping
    setExpandedDoc(undefined);
    const session = inspector.open(inspectorAdapters, {
      title: savedSearch.title,
    });
    setInspectorSession(session);
  }, [setExpandedDoc, inspectorAdapters, savedSearch, inspector]);

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);

  const { columns, onAddColumn, onRemoveColumn } = useColumns({
    capabilities,
    config: uiSettings,
    dataView,
    dataViews,
    setAppState: stateContainer.setAppState,
    state,
    useNewFieldsApi,
  });

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: unknown, operation: '+' | '-') => {
      const fieldName = typeof field === 'string' ? field : field.name;
      popularizeField(dataView, fieldName, dataViews, capabilities);
      const newFilters = generateFilters(filterManager, field, values, operation, dataView);
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
      }
      return filterManager.addFilters(newFilters);
    },
    [filterManager, dataView, dataViews, trackUiMetric, capabilities]
  );

  const onFieldEdited = useCallback(() => {
    savedSearchRefetch$.next('reset');
  }, [savedSearchRefetch$]);

  const onDisableFilters = useCallback(() => {
    const disabledFilters = filterManager
      .getFilters()
      .map((filter) => ({ ...filter, meta: { ...filter.meta, disabled: true } }));
    filterManager.setFilters(disabledFilters);
  }, [filterManager]);

  const toggleSidebarCollapse = useCallback(() => {
    storage.set(SIDEBAR_CLOSED_KEY, !isSidebarClosed);
    setIsSidebarClosed(!isSidebarClosed);
  }, [isSidebarClosed, storage]);

  const contentCentered =
    dataAccessState.matches('uninitialized') || dataAccessState.matches('failedNoData');
  const onDataViewCreated = useCallback(
    (newDataView: DataView) => {
      if (newDataView.id) {
        onChangeDataView(newDataView.id);
      }
    },
    [onChangeDataView]
  );

  const savedSearchTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    savedSearchTitle.current?.focus();
  }, []);

  return (
    <EuiPage className="dscPage">
      <h1
        id="savedSearchTitle"
        className="euiScreenReaderOnly"
        data-test-subj="discoverSavedSearchTitle"
        tabIndex={-1}
        ref={savedSearchTitle}
      >
        {savedSearch.title
          ? i18n.translate('discover.pageTitleWithSavedSearch', {
              defaultMessage: 'Discover - {savedSearchTitle}',
              values: {
                savedSearchTitle: savedSearch.title,
              },
            })
          : i18n.translate('discover.pageTitleWithoutSavedSearch', {
              defaultMessage: 'Discover - Search not yet saved',
            })}
      </h1>
      <TopNavMemoized
        dataView={dataView}
        onOpenInspector={onOpenInspector}
        query={state.query}
        navigateTo={navigateTo}
        savedQuery={state.savedQuery}
        savedSearch={savedSearch}
        searchSource={searchSource}
        stateContainer={stateContainer}
        updateQuery={onUpdateQuery}
        resetSavedSearch={resetSavedSearch}
        onChangeDataView={onChangeDataView}
        onFieldEdited={onFieldEdited}
        isPlainRecord={isPlainRecord}
        textBasedLanguageModeErrors={textBasedLanguageModeErrors}
      />
      <EuiPageBody className="dscPageBody" aria-describedby="savedSearchTitle">
        <SavedSearchURLConflictCallout
          savedSearch={savedSearch}
          spaces={spaces}
          history={history}
        />
        <EuiFlexGroup className="dscPageBody__contents" gutterSize="s">
          <EuiFlexItem grow={false}>
            <SidebarMemoized
              columns={columns}
              dataViewList={dataViewList}
              onAddField={onAddColumn}
              onAddFilter={onAddFilter}
              onRemoveField={onRemoveColumn}
              onChangeDataView={onChangeDataView}
              selectedDataView={dataView}
              state={state}
              isClosed={isSidebarClosed}
              trackUiMetric={trackUiMetric}
              useNewFieldsApi={useNewFieldsApi}
              onFieldEdited={onFieldEdited}
              onDataViewCreated={onDataViewCreated}
              viewMode={VIEW_MODE.LOG_EXPLORER}
              /* Short circuit deriving fields from the documents, just derive from the fieldCounts */
              documents={[]}
              fieldCounts={fieldCounts}
            />
          </EuiFlexItem>
          <EuiHideFor sizes={['xs', 's']}>
            <EuiFlexItem grow={false}>
              <div>
                <EuiSpacer size="s" />
                <EuiButtonIcon
                  iconType={isSidebarClosed ? 'menuRight' : 'menuLeft'}
                  iconSize="m"
                  size="xs"
                  onClick={toggleSidebarCollapse}
                  data-test-subj="collapseSideBarButton"
                  aria-controls="discover-sidebar"
                  aria-expanded={isSidebarClosed ? 'false' : 'true'}
                  aria-label={i18n.translate('discover.toggleSidebarAriaLabel', {
                    defaultMessage: 'Toggle sidebar',
                  })}
                />
              </div>
            </EuiFlexItem>
          </EuiHideFor>
          <EuiFlexItem className="dscPageContent__wrapper">
            <EuiPageContent
              verticalPosition={contentCentered ? 'center' : undefined}
              horizontalPosition={contentCentered ? 'center' : undefined}
              paddingSize="none"
              hasShadow={false}
              className={classNames('dscPageContent', {
                'dscPageContent--centered': contentCentered,
                'dscPageContent--emptyPrompt': dataAccessState.matches('failedNoData'),
              })}
            >
              {dataAccessState.matches('failedNoData') ? (
                <DiscoverNoResults
                  isTimeBased={isTimeBased}
                  data={data}
                  error={dataState.error}
                  hasQuery={isOfQueryType(state.query) && !!state.query?.query}
                  hasFilters={hasActiveFilter(state.filters)}
                  onDisableFilters={onDisableFilters}
                />
              ) : dataAccessState.matches('uninitialized') ? (
                <DiscoverUninitialized onRefresh={() => savedSearchRefetch$.next(undefined)} />
              ) : dataAccessState.matches('loadingAround') ? (
                <LoadingSpinner />
              ) : (
                <EuiFlexGroup
                  className="dscPageContent__inner"
                  direction="column"
                  alignItems="stretch"
                  gutterSize="none"
                  responsive={false}
                >
                  <LogExplorer
                    stateMachine={stateMachine}
                    expandedDoc={expandedDoc}
                    dataView={dataView}
                    navigateTo={navigateTo}
                    onAddFilter={onAddFilter as DocViewFilterFn}
                    savedSearch={savedSearch}
                    setExpandedDoc={setExpandedDoc}
                    state={state}
                    stateContainer={stateContainer}
                  />
                </EuiFlexGroup>
              )}
            </EuiPageContent>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
