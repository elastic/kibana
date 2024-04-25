/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiEmptyPrompt, EuiButton, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  isOfQueryType,
  isOfAggregateQueryType,
  type Query,
  type AggregateQuery,
  type Filter,
} from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { isTextBasedQuery } from '../../../utils/is_text_based_query';
import { NoResultsSuggestionDefault } from './no_results_suggestion_default';
import {
  NoResultsSuggestionWhenFilters,
  NoResultsSuggestionWhenFiltersProps,
} from './no_results_suggestion_when_filters';
import { NoResultsSuggestionWhenQuery } from './no_results_suggestion_when_query';
import { NoResultsSuggestionWhenTimeRange } from './no_results_suggestion_when_time_range';
import { hasActiveFilter } from '../../layout/utils';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useFetchOccurrencesRange } from './use_fetch_occurances_range';
import { NoResultsIllustration } from './assets/no_results_illustration';

enum TimeRangeExtendingStatus {
  initial = 'initial',
  loading = 'loading',
  success = 'success',
  notFound = 'notFound',
}

interface NoResultsSuggestionProps {
  dataView: DataView;
  isTimeBased?: boolean;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  onDisableFilters: NoResultsSuggestionWhenFiltersProps['onDisableFilters'];
}

export const NoResultsSuggestions: React.FC<NoResultsSuggestionProps> = ({
  dataView,
  isTimeBased,
  query,
  filters,
  onDisableFilters,
}) => {
  const { euiTheme } = useEuiTheme();
  const services = useDiscoverServices();
  const { data, uiSettings, timefilter } = services;
  const hasQuery =
    (isOfQueryType(query) && !!query?.query) || (!!query && isOfAggregateQueryType(query));
  const hasFilters = hasActiveFilter(filters);

  const [timeRangeExtendingStatus, setTimeRangeExtendingStatus] =
    useState<TimeRangeExtendingStatus>(TimeRangeExtendingStatus.initial);
  const { fetch } = useFetchOccurrencesRange({
    dataView,
    query,
    filters,
    services: {
      data,
      uiSettings,
    },
  });

  const extendTimeRange = useCallback(async () => {
    setTimeRangeExtendingStatus(TimeRangeExtendingStatus.loading);
    const range = await fetch();
    if (range?.from && range?.to) {
      timefilter.setTime({
        from: range.from,
        to: range.to,
      });
    } else {
      setTimeRangeExtendingStatus(TimeRangeExtendingStatus.notFound);
    }
  }, [fetch, setTimeRangeExtendingStatus, timefilter]);

  const canExpandTimeRange =
    isTimeBased && timeRangeExtendingStatus !== TimeRangeExtendingStatus.notFound;
  const canAdjustSearchCriteria = canExpandTimeRange || hasFilters || hasQuery;

  const body = canAdjustSearchCriteria ? (
    <>
      <FormattedMessage
        id="discover.noResults.suggestion.tryText"
        defaultMessage="Here are some things to try:"
      />
      <EuiSpacer size="xs" />
      <ul
        css={css`
          display: inline-block;
        `}
      >
        {canExpandTimeRange && (
          <li>
            <NoResultsSuggestionWhenTimeRange />
          </li>
        )}
        {hasQuery && (
          <li>
            <NoResultsSuggestionWhenQuery
              querySyntax={isOfQueryType(query) ? query.language : undefined}
            />
          </li>
        )}
        {hasFilters && (
          <li>
            <NoResultsSuggestionWhenFilters onDisableFilters={onDisableFilters} />
          </li>
        )}
      </ul>
    </>
  ) : timeRangeExtendingStatus !== TimeRangeExtendingStatus.notFound ? (
    <NoResultsSuggestionDefault dataView={dataView} />
  ) : null;

  return (
    <EuiEmptyPrompt
      layout="horizontal"
      color="transparent"
      icon={<NoResultsIllustration />}
      hasBorder={false}
      title={
        <h2 data-test-subj="discoverNoResults">
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsMatchSearchCriteriaTitle"
            defaultMessage="No results match your search&nbsp;criteria"
          />
        </h2>
      }
      body={body}
      actions={
        !isTextBasedQuery(query) ? (
          <div
            css={css`
              min-block-size: ${euiTheme.size.xxl};
            `}
          >
            {timeRangeExtendingStatus === TimeRangeExtendingStatus.notFound ? (
              <EuiText color="subdued">
                <FormattedMessage
                  id="discover.noResults.suggestion.searchAllMatchesButtonGivesNoResultsText"
                  defaultMessage="Expanding the time range gives no results too."
                />
              </EuiText>
            ) : (
              <EuiButton
                color="primary"
                fill
                onClick={extendTimeRange}
                isLoading={timeRangeExtendingStatus === TimeRangeExtendingStatus.loading}
                data-test-subj="discoverNoResultsViewAllMatches"
              >
                <FormattedMessage
                  id="discover.noResults.suggestion.searchAllMatchesButtonText"
                  defaultMessage="Search entire time range"
                />
              </EuiButton>
            )}
          </div>
        ) : undefined
      }
    />
  );
};
