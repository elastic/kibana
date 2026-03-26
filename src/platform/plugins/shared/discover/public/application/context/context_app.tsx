/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, memo, useEffect, useRef, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiText,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  euiPaddingSize,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { cloneDeep } from 'lodash';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { generateFilters } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { SORT_DEFAULT_ORDER_SETTING } from '@kbn/discover-utils';
import type { UseColumnsProps } from '@kbn/unified-data-table';
import { popularizeField, useColumns } from '@kbn/unified-data-table';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import { kbnFullBodyHeightCss } from '@kbn/css-utils/public/full_body_height_css';
import { ContextErrorMessage } from './components/context_error_message';
import { LoadingStatus } from './services/context_query_state';
import type { AppState, GlobalState } from './services/context_state';
import { isEqualFilters } from './services/context_state';
import { useContextAppState } from './hooks/use_context_app_state';
import { useContextAppFetch } from './hooks/use_context_app_fetch';
import { ContextAppContent } from './context_app_content';
import { SurrDocType } from './services/context';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { useScopedServices } from '../../components/scoped_services_provider';

const ContextAppContentMemoized = memo(ContextAppContent);

export interface ContextAppProps {
  dataView: DataView;
  anchorId: string;
  referrer?: string;
}

export const ContextApp = ({ dataView, anchorId, referrer }: ContextAppProps) => {
  const styles = useMemoCss(componentStyles);

  const services = useDiscoverServices();
  const { scopedEBTManager } = useScopedServices();
  const {
    locator,
    uiSettings,
    capabilities,
    dataViews,
    navigation,
    filterManager,
    core,
    fieldsMetadata,
  } = services;

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
      const surroundingDocsFetchTracker = scopedEBTManager.trackPerformanceEvent(
        'discoverSurroundingDocsFetch'
      );

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

      if (fetchType) {
        surroundingDocsFetchTracker.reportEvent({ meta: { fetchType } });
      }
    };

    doFetch();

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
    scopedEBTManager,
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
    async (field: DataViewField | string, values: unknown, operation: '+' | '-') => {
      const newFilters = generateFilters(filterManager, field, values, operation, dataView);
      filterManager.addFilters(newFilters);
      if (dataViews) {
        const fieldName = typeof field === 'string' ? field : field.name;
        await popularizeField(dataView, fieldName, dataViews, capabilities);
        void scopedEBTManager.trackFilterAddition({
          fieldName: fieldName === '_exists_' ? String(values) : fieldName,
          filterOperation: fieldName === '_exists_' ? '_exists_' : operation,
          fieldsMetadata,
        });
      }
    },
    [filterManager, dataView, dataViews, capabilities, scopedEBTManager, fieldsMetadata]
  );

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

  const TopNavMenu = navigation.ui.AggregateQueryTopNavMenu;
  const getNavBarProps = () => {
    return {
      appName: 'context',
      showSearchBar: true,
      showQueryInput: false,
      showFilterBar: true,
      showDatePicker: false,
      indexPatterns: [dataView],
      useDefaultBehaviors: true,
    };
  };

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
          <EuiPage css={styles.docsPage}>
            <EuiPageBody
              panelled
              paddingSize="none"
              css={styles.docsContent}
              panelProps={{ role: 'main' }}
            >
              <EuiText data-test-subj="contextDocumentSurroundingHeader" css={styles.title}>
                <FormattedMessage
                  id="discover.context.contextOfTitle"
                  defaultMessage="Documents surrounding {anchorId}"
                  values={{
                    anchorId: <span css={styles.documentId}>#{anchorId}</span>,
                  }}
                />
              </EuiText>
              <EuiSpacer size="s" />
              <ContextAppContentMemoized
                dataView={dataView}
                columns={columns}
                grid={appState.grid}
                onAddColumn={onAddColumnWithTracking}
                onRemoveColumn={onRemoveColumnWithTracking}
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

const componentStyles = {
  docsContent: css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }),
  docsPage: kbnFullBodyHeightCss('54px'), // 54px is the action bar height
  title: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const titlePadding = euiPaddingSize(themeContext, 's');

    return css({
      padding: `${titlePadding} ${titlePadding} 0`,
      fontWeight: euiTheme.font.weight.bold,
    });
  },
  documentId: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      color: euiTheme.colors.textWarning,
      padding: `0 ${euiTheme.size.xs}`,
    }),
};
