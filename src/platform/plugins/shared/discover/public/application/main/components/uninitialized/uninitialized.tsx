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
import { css } from '@emotion/react';
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
import { DiscoverFederatedDataHint } from '../onboarding/discover_federated_data_hint';
import { RecommendedQueries } from './recommended_queries';
import { selectRecommendedQueries } from './select_recommended_queries';
import { useExtensionQueries } from './use_extension_queries';
import { useRecommendationSource } from './use_recommendation_source';
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

const fillResultsArea = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  width: '100%',
});

const centerInResultsArea = css({
  alignItems: 'center',
  display: 'flex',
  flex: '1 1 auto',
  justifyContent: 'center',
  minHeight: 0,
  overflow: 'auto',
  width: '100%',
});

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

  // The new ES|QL tab inherits the data source of the previous tab.
  // A data view such as logs-* matches nothing when the only data is a federated dataset,
  // so recommendations then read that dataset and skip queries that need an index.
  const indexPattern = currentDataSource.title;
  const {
    source: recommendationSource,
    isResolved: isRecommendationSourceResolved,
    isFederatedOnly,
  } = useRecommendationSource(indexPattern);
  const showFederatedCallout =
    isRecommendationSourceResolved && isFederatedOnly && Boolean(recommendationSource);
  const timeField = isFederatedOnly ? undefined : currentDataSource.timeFieldName;
  const sources = recommendationSource ? getSources(recommendationSource) : undefined;
  const sourceCommand = getSourceCommand(currentDataSource);
  const { queries: extensionQueries, isLoading: isLoadingExtensionQueries } = useExtensionQueries({
    sourceQuery:
      isRecommendationSourceResolved && sources && !isFederatedOnly
        ? `${sourceCommand} ${sources}`
        : undefined,
    isEnabled: isEsqlMode && isRecommendationSourceResolved && !isFederatedOnly,
  });
  const recommendedQueries = useMemo(
    () =>
      selectRecommendedQueries({
        extensionQueries,
        staticQueries: sources
          ? getRecommendedQueriesTemplates({ fromCommand: `FROM ${sources}`, timeField })
          : [],
        federatedOnly: isFederatedOnly,
      }),
    [extensionQueries, isFederatedOnly, sources, timeField]
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
      iconType="productDiscover"
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
    return <div css={[fillResultsArea, centerInResultsArea]}>{startSearchingPrompt}</div>;
  }

  return (
    <div css={fillResultsArea} data-test-subj="discoverUninitialized">
      {showFederatedCallout && recommendationSource ? (
        <DiscoverFederatedDataHint source={recommendationSource} />
      ) : null}
      <div css={centerInResultsArea}>
        <RecommendedQueries
          queries={
            !isRecommendationSourceResolved || isLoadingExtensionQueries ? [] : recommendedQueries
          }
          onRunQuery={onRunQuery}
        />
      </div>
    </div>
  );
};
