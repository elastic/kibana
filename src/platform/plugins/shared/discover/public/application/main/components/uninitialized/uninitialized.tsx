/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { DataSource } from '@kbn/data-source';
import { getRecommendedQueriesTemplates, shouldBeQuotedSource } from '@kbn/esql-language';
import { getInitialESQLQuery, getSourceCommandFromESQLQuery } from '@kbn/esql-utils';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import {
  internalStateActions,
  useCurrentDataSource,
  useCurrentDataView,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';
import { RecommendedQueries } from './recommended_queries';
import { selectRecommendedQueries } from './select_recommended_queries';
import { useExtensionQueries } from './use_extension_queries';
import { useCurrentTabMenuActions } from '../../hooks/use_current_tab_menu_actions';

// Cluster and selector separators are valid unquoted, so only the other special characters force quotes.
const quoteSourceIfNeeded = (source: string) =>
  shouldBeQuotedSource(source.replace(/:/g, '')) ? `"${source}"` : source;

const getSources = (indexPattern: string) =>
  indexPattern
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean)
    .map(quoteSourceIfNeeded)
    .join(',');

const getSourceCommand = (dataSource: DataSource): string => {
  const query =
    dataSource.kind === 'esql' ? dataSource.query : getInitialESQLQuery(dataSource.getDataView());
  return getSourceCommandFromESQLQuery(query) || 'FROM';
};

interface Props {
  onRefresh: () => void;
}

export const DiscoverUninitialized = ({ onRefresh }: Props) => {
  const isEsqlMode = useIsEsqlMode();
  const currentDataView = useCurrentDataView();
  const currentDataSource = useCurrentDataSource();
  const { canSwitchLanguageMode, isDataViewMode, switchLanguageMode } = useCurrentTabMenuActions({
    currentDataView,
    switchToEsqlMetric: 'esql:uninitialized_query_in_esql_clicked',
  });
  const dispatch = useInternalStateDispatch();
  const updateESQLQuery = useCurrentTabAction(internalStateActions.updateESQLQuery);

  // The new ES|QL tab inherits the data source of the previous tab, which gives us a source.
  const indexPattern = currentDataSource.title;
  const timeField = currentDataSource.timeFieldName;
  const sources = indexPattern ? getSources(indexPattern) : undefined;
  const sourceCommand = useMemo(() => getSourceCommand(currentDataSource), [currentDataSource]);
  const { queries: extensionQueries, isLoading: isLoadingExtensionQueries } = useExtensionQueries({
    sourceQuery: sources ? `${sourceCommand} ${sources}` : undefined,
    isEnabled: isEsqlMode,
  });
  const recommendedQueries = useMemo(
    () =>
      selectRecommendedQueries({
        extensionQueries,
        staticQueries: sources
          ? getRecommendedQueriesTemplates({ fromCommand: `FROM ${sources}`, timeField })
          : [],
      }),
    [extensionQueries, sources, timeField]
  );
  const onRunQuery = useCallback(
    (query: string) => {
      dispatch(updateESQLQuery({ queryOrUpdater: query }));
    },
    [dispatch, updateESQLQuery]
  );

  const startSearchingPrompt = (
    <EuiEmptyPrompt
      data-test-subj="discoverUninitialized"
      iconType="discoverApp"
      title={
        <h2>
          <FormattedMessage id="discover.uninitializedTitle" defaultMessage="Start searching" />
        </h2>
      }
      body={
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="discover.uninitializedText"
              defaultMessage="Write a query, add some filters, or simply hit Refresh to retrieve results for the current query."
            />
          </p>
        </EuiText>
      }
      actions={
        <EuiFlexGroup responsive={false} alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButton color="primary" fill onClick={onRefresh} data-test-subj="refreshDataButton">
              <FormattedMessage
                id="discover.uninitializedRefreshButtonText"
                defaultMessage="Refresh data"
              />
            </EuiButton>
          </EuiFlexItem>
          {canSwitchLanguageMode && isDataViewMode && (
            <>
              <EuiFlexItem grow={false}>
                <EuiText component="span" size="s" color="subdued">
                  <FormattedMessage id="discover.uninitializedActionsOrText" defaultMessage="or" />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  iconType="code"
                  onClick={switchLanguageMode}
                  data-test-subj="queryInEsqlButton"
                >
                  <FormattedMessage
                    id="discover.uninitializedQueryInEsqlButtonText"
                    defaultMessage="Query in ES|QL"
                  />
                </EuiButton>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      }
    />
  );

  if (!isEsqlMode) {
    return startSearchingPrompt;
  }

  return (
    <div data-test-subj="discoverUninitialized">
      <RecommendedQueries
        queries={isLoadingExtensionQueries ? [] : recommendedQueries}
        onRunQuery={onRunQuery}
      />
    </div>
  );
};
