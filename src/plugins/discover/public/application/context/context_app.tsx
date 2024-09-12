/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, memo, useEffect, useRef, useMemo, useCallback } from 'react';
import './context_app.scss';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText, EuiPage, EuiPageBody, EuiSpacer, useEuiPaddingSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { cloneDeep } from 'lodash';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { generateFilters } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  DOC_TABLE_LEGACY,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { UseColumnsProps, popularizeField, useColumns } from '@kbn/unified-data-table';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import { ContextErrorMessage } from './components/context_error_message';
import { LoadingStatus } from './services/context_query_state';
import { AppState, GlobalState, isEqualFilters } from './services/context_state';
import { useContextAppState } from './hooks/use_context_app_state';
import { useContextAppFetch } from './hooks/use_context_app_fetch';
import { ContextAppContent } from './context_app_content';
import { SurrDocType } from './services/context';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { setBreadcrumbs } from '../../utils/breadcrumbs';

const ContextAppContentMemoized = memo(ContextAppContent);

export interface ContextAppProps {
  dataView: DataView;
  anchorId: string;
  referrer?: string;
}

export const ContextApp = ({ dataView, anchorId, referrer }: ContextAppProps) => {
  const services = useDiscoverServices();
  const {
    analytics,
    locator,
    uiSettings,
    capabilities,
    dataViews,
    navigation,
    filterManager,
    core,
  } = services;

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

  const setAppState = useCallback<UseColumnsProps['setAppState']>(
    ({ settings, ...rest }) => {
      stateContainer.setAppState({ ...rest, grid: settings as DiscoverGridSettings });
    },
    [stateContainer]
  );

  const { columns, onAddColumn, onRemoveColumn, onSetColumns } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    useNewFieldsApi,
    setAppState,
    columns: appState.columns,
    sort: appState.sort,
    settings: appState.grid,
  });

  useEffect(() => {
    setBreadcrumbs({
      services,
      rootBreadcrumbPath: referrer,
      titleBreadcrumbText: i18n.translate('discover.context.breadcrumb', {
        defaultMessage: 'Surrounding documents',
      }),
    });
  }, [locator, referrer, services]);

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
    const doFetch = async () => {
      const startTime = window.performance.now();
      let fetchType = '';
      if (!prevAppState.current) {
        fetchType = 'all';
        await fetchAllRows();
      } else if (prevAppState.current.predecessorCount !== appState.predecessorCount) {
        fetchType = 'predecessors';
        await fetchSurroundingRows(SurrDocType.PREDECESSORS);
      } else if (prevAppState.current.successorCount !== appState.successorCount) {
        fetchType = 'successors';
        await fetchSurroundingRows(SurrDocType.SUCCESSORS);
      } else if (
        !isEqualFilters(prevAppState.current.filters, appState.filters) ||
        !isEqualFilters(prevGlobalState.current.filters, globalState.filters)
      ) {
        fetchType = 'context';
        await fetchContextRows();
      }

      if (analytics && fetchType) {
        const fetchDuration = window.performance.now() - startTime;
        reportPerformanceMetricEvent(analytics, {
          eventName: 'discoverSurroundingDocsFetch',
          duration: fetchDuration,
          meta: { fetchType },
        });
      }
    };

    doFetch();

    prevAppState.current = cloneDeep(appState);
    prevGlobalState.current = cloneDeep(globalState);
  }, [
    analytics,
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

  const interceptedWarnings = useMemo(
    () => [
      ...(fetchedState.predecessorsInterceptedWarnings || []),
      ...(fetchedState.anchorInterceptedWarnings || []),
      ...(fetchedState.successorsInterceptedWarnings || []),
    ],
    [
      fetchedState.predecessorsInterceptedWarnings,
      fetchedState.anchorInterceptedWarnings,
      fetchedState.successorsInterceptedWarnings,
    ]
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

  const TopNavMenu = navigation.ui.AggregateQueryTopNavMenu;
  const getNavBarProps = () => {
    return {
      appName: 'context',
      showSearchBar: true,
      showQueryInput: false,
      showFilterBar: true,
      saveQueryMenuVisibility: 'hidden' as const,
      showDatePicker: false,
      indexPatterns: [dataView],
      useDefaultBehaviors: true,
    };
  };

  const titlePadding = useEuiPaddingSize('m');

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
          >
            {i18n.translate('discover.context.pageTitle', {
              defaultMessage: 'Documents surrounding #{anchorId}',
              values: { anchorId },
            })}
          </h1>
          <TopNavMenu {...getNavBarProps()} />
          <EuiPage className={classNames({ dscDocsPage: !isLegacy })}>
            <EuiPageBody
              panelled
              paddingSize="none"
              className="dscDocsContent"
              panelProps={{ role: 'main' }}
            >
              <EuiText
                data-test-subj="contextDocumentSurroundingHeader"
                css={css`
                  padding: ${titlePadding} ${titlePadding} 0;
                `}
              >
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
                grid={appState.grid}
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
                interceptedWarnings={interceptedWarnings}
              />
            </EuiPageBody>
          </EuiPage>
        </Fragment>
      )}
    </Fragment>
  );
};
