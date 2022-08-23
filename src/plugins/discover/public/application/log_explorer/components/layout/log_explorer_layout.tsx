/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import '../../../main/components/layout/discover_layout.scss';
import React, { useCallback, useEffect, useRef } from 'react';
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
import classNames from 'classnames';
import { VIEW_MODE } from '../../../../components/view_mode_toggle';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverNoResults } from '../../../main/components/no_results';
import { LoadingSpinner } from '../../../main/components/loading_spinner/loading_spinner';
import { DiscoverSidebarResponsive } from '../../../main/components/sidebar';
import { DiscoverLayoutProps } from '../../../main/components/layout/types';
import { DiscoverTopNav } from '../../../main/components/top_nav/discover_topnav';
import { DocViewFilterFn } from '../../../../services/doc_views/doc_views_types';
import { hasActiveFilter } from '../../../main/components/layout/utils';
import { LogExplorer } from './log_explorer';
import { useEntries, useHistogram } from '../../hooks/query_data/use_state_machine';
import { useFieldCounts } from '../../hooks/use_field_counts';
import { useDiscoverStateContext } from '../../hooks/discover_state/use_discover_state';
import { useSidebarState } from '../../hooks/ui/use_sidebar_state';
import { useDiscoverColumnsContext } from '../../hooks/discover_state/use_columns';
import { SavedSearchURLConflictCallout } from '../../../../components/saved_search_url_conflict_callout/saved_search_url_conflict_callout';
import { LogExplorerHistogram } from './log_explorer_histogram';

const SidebarMemoized = React.memo(DiscoverSidebarResponsive);
const TopNavMemoized = React.memo(DiscoverTopNav);
const LogExplorerHistogramMemoized = React.memo(LogExplorerHistogram);

export function LogExplorerLayout({
  dataViewList,
  inspectorAdapters,
  expandedDoc,
  setExpandedDoc,
  savedSearch,
}: DiscoverLayoutProps) {
  // Access to Discover services
  const { trackUiMetric, data, storage, history, spaces, inspector } = useDiscoverServices();

  // Access to "outer" Discover state
  const {
    dataView,
    onChangeDataView,
    onDataViewCreated,
    resetSavedSearch,
    searchSource,
    state,
    stateContainer,
    navigateTo,
    onAddFilter,
    onDisableFilters,
  } = useDiscoverStateContext();

  // Inspector
  // TODO: Fix this and move to independent hook

  // const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);
  // const onOpenInspector = useCallback(() => {
  //   // prevent overlapping
  //   setExpandedDoc(undefined);
  //   const session = inspector.open(inspectorAdapters, {
  //     title: savedSearch.title,
  //   });
  //   setInspectorSession(session);
  // }, [setExpandedDoc, inspectorAdapters, savedSearch, inspector]);
  // useEffect(() => {
  //   return () => {
  //     if (inspectorSession) {
  //       // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
  //       inspectorSession.close();
  //     }
  //   };
  // }, [inspectorSession]);

  // Data querying state machine access and derivatives
  const [entriesActor, entriesState, entriesSend] = useEntries();
  const [histogramActor, histogramState, histogramSend] = useHistogram();
  console.log(entriesActor, entriesState);
  const fieldCounts = useFieldCounts(entriesActor);

  // Sidebar state
  const { isSidebarClosed, toggleSidebarCollapse } = useSidebarState({
    storage,
  });

  // Columns
  const { columns, onAddColumn, onRemoveColumn } = useDiscoverColumnsContext();

  const onFieldEdited = useCallback(() => {
    // TODO: Refetch via state machine
    // savedSearchRefetch$.next('reset');
  }, []);

  const contentCentered =
    entriesState.matches('uninitialized') || entriesState.matches('failedNoData');

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
        // onOpenInspector={onOpenInspector}
        query={state.query}
        navigateTo={navigateTo}
        savedQuery={state.savedQuery}
        savedSearch={savedSearch}
        searchSource={searchSource}
        stateContainer={stateContainer}
        // updateQuery={onUpdateQuery} - TODO: respond to query updates
        resetSavedSearch={resetSavedSearch}
        onChangeDataView={onChangeDataView}
        onFieldEdited={onFieldEdited}
        // isPlainRecord={isPlainRecord} - SQL
        // textBasedLanguageModeErrors={textBasedLanguageModeErrors} - SQL
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
              useNewFieldsApi={true}
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
          <EuiFlexItem className="dscPageContent__wrapper" style={{ paddingRight: 0 }}>
            <EuiPageContent
              verticalPosition={contentCentered ? 'center' : undefined}
              horizontalPosition={contentCentered ? 'center' : undefined}
              paddingSize="none"
              hasShadow={false}
              className={classNames('dscPageContent', {
                'dscPageContent--centered': contentCentered,
                'dscPageContent--emptyPrompt': entriesState.matches('failedNoData'),
              })}
            >
              {entriesState.matches('failedNoData') ? (
                <DiscoverNoResults
                  isTimeBased={true}
                  data={data}
                  // error={dataState.error}
                  hasQuery={isOfQueryType(state.query) && !!state.query?.query}
                  hasFilters={hasActiveFilter(state.filters)}
                  onDisableFilters={onDisableFilters}
                />
              ) : entriesState.matches('loadingAround') ? (
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
                    stateMachine={entriesActor}
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
          <EuiFlexItem grow={false}>
            <LogExplorerHistogramMemoized
              histogramService={histogramActor}
              entriesService={entriesActor}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageBody>
    </EuiPage>
  );
}
