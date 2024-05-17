/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiEmptyPrompt, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  type AggregateQuery,
  type Filter,
  type Query,
  isOfAggregateQueryType,
  isOfQueryType,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState } from 'react';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { isTextBasedQuery } from '../../../utils/is_text_based_query';
import { hasActiveFilter } from '../../layout/utils';
import { NoResultsIllustration } from './assets/no_results_illustration';
import { NoResultsSuggestionDefault } from './no_results_suggestion_default';
import {
  NoResultsSuggestionWhenFilters,
  NoResultsSuggestionWhenFiltersProps,
} from './no_results_suggestion_when_filters';
import { NoResultsSuggestionWhenQuery } from './no_results_suggestion_when_query';
import { NoResultsSuggestionWhenTimeRange } from './no_results_suggestion_when_time_range';
import { TimeRangeExtendingStatus, useFetchOccurrencesRange } from './use_fetch_occurances_range';

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
  const { data, uiSettings, timefilter, toastNotifications } = services;
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
    const { status, range } = await fetch();

    if (status === TimeRangeExtendingStatus.succeedWithResults && range?.from && range?.to) {
      timefilter.setTime({
        from: range.from,
        to: range.to,
      });
      return;
    }

    setTimeRangeExtendingStatus(status);

    if (status === TimeRangeExtendingStatus.failed) {
      toastNotifications.addDanger(
        i18n.translate('discover.noResults.suggestion.expandTimeRangeFailedNotification', {
          defaultMessage: 'Request failed when searching the entire time range of documents',
        })
      );
    } else if (status === TimeRangeExtendingStatus.timedOut) {
      toastNotifications.addDanger(
        i18n.translate('discover.noResults.suggestion.expandTimeRangeTimedOutNotification', {
          defaultMessage: 'Request timed out when searching the entire time range of documents',
        })
      );
    }
  }, [fetch, setTimeRangeExtendingStatus, timefilter, toastNotifications]);

  const canAdjustSearchCriteria = isTimeBased || hasFilters || hasQuery;

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
        {isTimeBased && (
          <li>
            <NoResultsSuggestionWhenTimeRange timeRangeExtendingStatus={timeRangeExtendingStatus} />
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
  ) : (
    <NoResultsSuggestionDefault dataView={dataView} />
  );

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
        !isTextBasedQuery(query) && isTimeBased ? (
          <div
            css={css`
              min-block-size: ${euiTheme.size.xxl};
            `}
          >
            {[
              TimeRangeExtendingStatus.initial,
              TimeRangeExtendingStatus.loading,
              TimeRangeExtendingStatus.timedOut,
              TimeRangeExtendingStatus.failed,
            ].includes(timeRangeExtendingStatus) && (
              <EuiButton
                color="primary"
                fill
                onClick={extendTimeRange}
                disabled={timeRangeExtendingStatus === TimeRangeExtendingStatus.loading}
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
