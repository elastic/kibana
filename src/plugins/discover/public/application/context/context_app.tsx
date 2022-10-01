/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, memo, useEffect, useRef, useMemo, useCallback } from 'react';
import './context_app.scss';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPage,
  EuiSpacer,
} from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { generateFilters } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { DOC_TABLE_LEGACY, SEARCH_FIELDS_FROM_SOURCE } from '../../../common';
import { ContextErrorMessage } from './components/context_error_message';
import { LoadingStatus } from './services/context_query_state';
import { AppState, GlobalState, isEqualFilters } from './services/context_state';
import { useColumns } from '../../hooks/use_data_grid_columns';
import { useContextAppState } from './hooks/use_context_app_state';
import { useContextAppFetch } from './hooks/use_context_app_fetch';
import { popularizeField } from '../../utils/popularize_field';
import { ContextAppContent } from './context_app_content';
import { SurrDocType } from './services/context';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getRootBreadcrumbs } from '../../utils/breadcrumbs';
import { ContextHistoryLocationState } from './services/locator';
import { getUiActions } from '../../kibana_services';
import { useRootBreadcrumb } from '../../hooks/use_root_breadcrumb';

const ContextAppContentMemoized = memo(ContextAppContent);

export interface ContextAppProps {
  dataView: DataView;
  anchorId: string;
  locationState?: ContextHistoryLocationState;
}

export const ContextApp = ({
  dataView,
  anchorId,
  locationState: preservedReferrerState = {},
}: ContextAppProps) => {
  const services = useDiscoverServices();
  const { locator, uiSettings, capabilities, dataViews, navigation, filterManager, core } =
    services;

  const initialDataViewId = useRef(dataView.id).current;
  const isLegacy = useMemo(() => uiSettings.get(DOC_TABLE_LEGACY), [uiSettings]);
  const useNewFieldsApi = useMemo(() => !uiSettings.get(SEARCH_FIELDS_FROM_SOURCE), [uiSettings]);

  /**
   * Context app state
   */
  const { appState, globalState, stateContainer } = useContextAppState({
    services,
    dataView,
  });
  const prevAppState = useRef<AppState>();
  const prevGlobalState = useRef<GlobalState>({ filters: [] });

  const { columns, onAddColumn, onRemoveColumn, onSetColumns } = useColumns({
    capabilities,
    config: uiSettings,
    dataView,
    dataViews,
    state: appState,
    useNewFieldsApi,
    setAppState: stateContainer.setAppState,
  });

  const breadcrumb = useRootBreadcrumb({
    dataViewId: dataView.id!,
    filters: appState.filters,
    columns,
    timeRange: preservedReferrerState.timeRange,
    query: preservedReferrerState.query,
    savedSearchId: preservedReferrerState.savedSearchId,
  });

  useEffect(() => {
    services.chrome.setBreadcrumbs([
      ...getRootBreadcrumbs({ href: breadcrumb }),
      {
        text: i18n.translate('discover.context.breadcrumb', {
          defaultMessage: 'Surrounding documents',
        }),
      },
    ]);
  }, [breadcrumb, locator, services.chrome]);

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'context',
    id: dataView.id || '',
  });

  /**
   * Context fetched state
   */
  const { fetchedState, fetchContextRows, fetchAllRows, fetchSurroundingRows, resetFetchedState } =
    useContextAppFetch({
      anchorId,
      dataView,
      appState,
      useNewFieldsApi,
    });

  /**
   * Reset state when anchor changes
   */
  useEffect(() => {
    if (prevAppState.current) {
      prevAppState.current = undefined;
      resetFetchedState();
    }
  }, [anchorId, resetFetchedState]);

  /**
   * Fetch docs on ui changes
   */
  useEffect(() => {
    if (!prevAppState.current) {
      fetchAllRows();
    } else if (prevAppState.current.predecessorCount !== appState.predecessorCount) {
      fetchSurroundingRows(SurrDocType.PREDECESSORS);
    } else if (prevAppState.current.successorCount !== appState.successorCount) {
      fetchSurroundingRows(SurrDocType.SUCCESSORS);
    } else if (
      !isEqualFilters(prevAppState.current.filters, appState.filters) ||
      !isEqualFilters(prevGlobalState.current.filters, globalState.filters)
    ) {
      fetchContextRows();
    }

    prevAppState.current = cloneDeep(appState);
    prevGlobalState.current = cloneDeep(globalState);
  }, [
    appState,
    globalState,
    anchorId,
    fetchContextRows,
    fetchAllRows,
    fetchSurroundingRows,
    fetchedState.anchor.id,
  ]);

  const rows = useMemo(
    () => [
      ...(fetchedState.predecessors || []),
      ...(fetchedState.anchor.id ? [fetchedState.anchor] : []),
      ...(fetchedState.successors || []),
    ],
    [fetchedState.predecessors, fetchedState.anchor, fetchedState.successors]
  );

  const addFilter = useCallback(
    async (field: DataViewField | string, values: unknown, operation: string) => {
      const newFilters = generateFilters(filterManager, field, values, operation, dataView);
      filterManager.addFilters(newFilters);
      if (dataViews) {
        const fieldName = typeof field === 'string' ? field : field.name;
        await popularizeField(dataView, fieldName, dataViews, capabilities);
      }
    },
    [filterManager, dataViews, dataView, capabilities]
  );

  const updateAdHocDataViewId = useCallback(
    async (dataViewToUpdate: DataView) => {
      const updatedDataView = await dataViews.create({
        ...dataViewToUpdate.toSpec(),
        id: undefined,
      });

      // do not clear data view from cache to preserve it for go back action
      if (initialDataViewId !== dataViewToUpdate.id) {
        dataViews.clearInstanceCache(dataViewToUpdate.id);
      }

      return updatedDataView;
    },
    [dataViews, initialDataViewId]
  );

  const onAdHocDataViewChange = useCallback(async () => {
    const updatedDataView = await updateAdHocDataViewId(dataView);

    const uiActions = await getUiActions();
    const trigger = uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
    const action = uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

    /**
     * Execute doesn't needs to be awaited, this is important.
     * Since pending history push, caused by filters update should be cancelled right away.
     */
    action?.execute({
      trigger,
      fromDataView: dataView.id,
      toDataView: updatedDataView.id,
      usedDataViews: [],
    } as ActionExecutionContext);

    // cancel pending history push triggered by just updated filters
    stateContainer.kbnUrlControls.cancel();

    // getting just updated filters syncronously.
    const updatedFilters = [...filterManager.getGlobalFilters(), ...filterManager.getAppFilters()];
    services.contextLocator.navigate(
      {
        rowId: anchorId,
        dataViewSpec: updatedDataView.toSpec(false),
        columns,
        filters: updatedFilters,
        timeRange: preservedReferrerState.timeRange,
        query: preservedReferrerState.query,
      },
      { replace: true }
    );
  }, [
    anchorId,
    columns,
    dataView,
    filterManager,
    preservedReferrerState.query,
    preservedReferrerState.timeRange,
    services.contextLocator,
    stateContainer.kbnUrlControls,
    updateAdHocDataViewId,
  ]);

  const onFieldEdited = useCallback(async () => {
    if (!dataView.isPersisted()) {
      onAdHocDataViewChange();
    } else {
      fetchAllRows();
    }
  }, [dataView, fetchAllRows, onAdHocDataViewChange]);

  const TopNavMenu = navigation.ui.AggregateQueryTopNavMenu;
  const getNavBarProps = () => {
    return {
      appName: 'context',
      showSearchBar: true,
      showQueryBar: true,
      showQueryInput: false,
      showFilterBar: true,
      showSaveQuery: false,
      showDatePicker: false,
      indexPatterns: [dataView],
      useDefaultBehaviors: true,
    };
  };

  const contextAppTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    contextAppTitle.current?.focus();
  }, []);

  return (
    <Fragment>
      {fetchedState.anchorStatus.value === LoadingStatus.FAILED ? (
        <ContextErrorMessage status={fetchedState.anchorStatus} />
      ) : (
        <Fragment>
          <h1
            id="contextAppTitle"
            className="euiScreenReaderOnly"
            data-test-subj="discoverContextAppTitle"
            tabIndex={-1}
            ref={contextAppTitle}
          >
            {i18n.translate('discover.context.pageTitle', {
              defaultMessage: 'Documents surrounding #{anchorId}',
              values: { anchorId },
            })}
          </h1>
          <TopNavMenu {...getNavBarProps()} />
          <EuiPage className={classNames({ dscDocsPage: !isLegacy })}>
            <EuiPageContent paddingSize="s" className="dscDocsContent">
              <EuiSpacer size="s" />
              <EuiText data-test-subj="contextDocumentSurroundingHeader">
                <strong>
                  <FormattedMessage
                    id="discover.context.contextOfTitle"
                    defaultMessage="Documents surrounding #{anchorId}"
                    values={{ anchorId }}
                  />
                </strong>
              </EuiText>
              <EuiSpacer size="s" />
              <ContextAppContentMemoized
                dataView={dataView}
                useNewFieldsApi={useNewFieldsApi}
                isLegacy={isLegacy}
                columns={columns}
                onAddColumn={onAddColumn}
                onRemoveColumn={onRemoveColumn}
                onSetColumns={onSetColumns}
                predecessorCount={appState.predecessorCount}
                successorCount={appState.successorCount}
                setAppState={stateContainer.setAppState}
                addFilter={addFilter as DocViewFilterFn}
                rows={rows}
                predecessors={fetchedState.predecessors}
                successors={fetchedState.successors}
                anchorStatus={fetchedState.anchorStatus.value}
                predecessorsStatus={fetchedState.predecessorsStatus.value}
                successorsStatus={fetchedState.successorsStatus.value}
                onFieldEdited={onFieldEdited}
              />
            </EuiPageContent>
          </EuiPage>
        </Fragment>
      )}
    </Fragment>
  );
};
