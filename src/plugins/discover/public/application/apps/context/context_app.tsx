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
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiPageContent, EuiPage, EuiSpacer } from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { esFilters, SortDirection } from '../../../../../data/public';
import { DOC_TABLE_LEGACY, SEARCH_FIELDS_FROM_SOURCE } from '../../../../common';
import { ContextErrorMessage } from './components/context_error_message';
import { IndexPattern, IndexPatternField } from '../../../../../data/common';
import { LoadingStatus } from './services/context_query_state';
import { getServices } from '../../../kibana_services';
import { AppState, isEqualFilters } from './services/context_state';
import { useDataGridColumns } from '../../helpers/use_data_grid_columns';
import { useContextAppState } from './utils/use_context_app_state';
import { useContextAppFetch } from './utils/use_context_app_fetch';
import { popularizeField } from '../../helpers/popularize_field';
import { ContextAppContent } from './context_app_content';
import { SurrDocType } from './services/context';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';

const ContextAppContentMemoized = memo(ContextAppContent);

export interface ContextAppProps {
  indexPattern: IndexPattern;
  indexPatternId: string;
  anchorId: string;
}

export const ContextApp = ({ indexPattern, indexPatternId, anchorId }: ContextAppProps) => {
  const services = getServices();
  const { uiSettings: config, capabilities, indexPatterns, navigation, filterManager } = services;

  const isLegacy = useMemo(() => config.get(DOC_TABLE_LEGACY), [config]);
  const useNewFieldsApi = useMemo(() => !config.get(SEARCH_FIELDS_FROM_SOURCE), [config]);

  /**
   * Context app state
   */
  const { appState, setAppState } = useContextAppState({ indexPattern, services });
  const prevAppState = useRef<AppState>();

  /**
   * Context fetched state
   */
  const { fetchedState, fetchContextRows, fetchAllRows, fetchSurroundingRows } = useContextAppFetch(
    {
      anchorId,
      indexPatternId,
      indexPattern,
      appState,
      useNewFieldsApi,
      services,
    }
  );

  /**
   * Fetch docs on ui changes
   */
  useEffect(() => {
    if (!prevAppState.current || fetchedState.anchor._id !== anchorId) {
      fetchAllRows();
    } else if (prevAppState.current.predecessorCount !== appState.predecessorCount) {
      fetchSurroundingRows(SurrDocType.PREDECESSORS);
    } else if (prevAppState.current.successorCount !== appState.successorCount) {
      fetchSurroundingRows(SurrDocType.SUCCESSORS);
    } else if (!isEqualFilters(prevAppState.current.filters, appState.filters)) {
      fetchContextRows();
    }

    prevAppState.current = cloneDeep(appState);
  }, [
    appState,
    indexPatternId,
    anchorId,
    fetchContextRows,
    fetchAllRows,
    fetchSurroundingRows,
    fetchedState.anchor._id,
  ]);

  const { columns, onAddColumn, onRemoveColumn, onSetColumns } = useDataGridColumns({
    capabilities,
    config,
    indexPattern,
    indexPatterns,
    state: appState,
    useNewFieldsApi,
    setAppState,
  });
  const rows = useMemo(
    () => [
      ...(fetchedState.predecessors || []),
      ...(fetchedState.anchor._id ? [fetchedState.anchor] : []),
      ...(fetchedState.successors || []),
    ],
    [fetchedState.predecessors, fetchedState.anchor, fetchedState.successors]
  );

  const addFilter = useCallback(
    async (field: IndexPatternField | string, values: unknown, operation: string) => {
      const newFilters = esFilters.generateFilters(
        filterManager,
        field,
        values,
        operation,
        indexPatternId
      );
      filterManager.addFilters(newFilters);
      if (indexPatterns) {
        const fieldName = typeof field === 'string' ? field : field.name;
        await popularizeField(indexPattern, fieldName, indexPatterns, capabilities);
      }
    },
    [filterManager, indexPatternId, indexPatterns, indexPattern, capabilities]
  );

  const TopNavMenu = navigation.ui.TopNavMenu;
  const getNavBarProps = () => {
    return {
      appName: 'context',
      showSearchBar: true,
      showQueryBar: false,
      showFilterBar: true,
      showSaveQuery: false,
      showDatePicker: false,
      indexPatterns: [indexPattern],
      useDefaultBehaviors: true,
    };
  };

  return (
    <Fragment>
      {fetchedState.anchorStatus.value === LoadingStatus.FAILED ? (
        <ContextErrorMessage status={fetchedState.anchorStatus} />
      ) : (
        <Fragment>
          <TopNavMenu {...getNavBarProps()} />
          <EuiPage className={classNames({ dscDocsPage: !isLegacy })}>
            <EuiPageContent paddingSize="s" className="dscDocsContent">
              <EuiSpacer size="s" />
              <EuiText>
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
                services={services}
                indexPattern={indexPattern}
                useNewFieldsApi={useNewFieldsApi}
                isLegacy={isLegacy}
                columns={columns}
                onAddColumn={onAddColumn}
                onRemoveColumn={onRemoveColumn}
                onSetColumns={onSetColumns}
                sort={appState.sort as [[string, SortDirection]]}
                predecessorCount={appState.predecessorCount}
                successorCount={appState.successorCount}
                setAppState={setAppState}
                addFilter={addFilter as DocViewFilterFn}
                rows={rows}
                predecessors={fetchedState.predecessors}
                successors={fetchedState.successors}
                anchorStatus={fetchedState.anchorStatus.value}
                predecessorsStatus={fetchedState.predecessorsStatus.value}
                successorsStatus={fetchedState.successorsStatus.value}
              />
            </EuiPageContent>
          </EuiPage>
        </Fragment>
      )}
    </Fragment>
  );
};
