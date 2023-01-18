/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import dateMath from '@kbn/datemath';
import { EuiEmptyPrompt, EuiButton, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { isOfQueryType, isOfAggregateQueryType } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuerySubscriber } from '@kbn/unified-field-list-plugin/public';
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

interface NoResultsSuggestionProps {
  dataView: DataView;
  isTimeBased?: boolean;
  onDisableFilters: NoResultsSuggestionWhenFiltersProps['onDisableFilters'];
}

export const NoResultsSuggestions: React.FC<NoResultsSuggestionProps> = React.memo(
  ({ dataView, isTimeBased, onDisableFilters }) => {
    const services = useDiscoverServices();
    const { data, uiSettings, timefilter } = services;
    const { query, filters } = useQuerySubscriber({ data });
    const hasQuery =
      (isOfQueryType(query) && !!query?.query) || (!!query && isOfAggregateQueryType(query));
    const hasFilters = hasActiveFilter(filters);

    const {
      isLoading,
      range: occurrencesRange,
      refetch,
    } = useFetchOccurrencesRange({
      dataView,
      query,
      filters,
      services: {
        data,
        uiSettings,
      },
    });

    const expandTimeRange = async () => {
      const range = await refetch();
      if (range?.from && range?.to) {
        timefilter.setTime({
          from: dateMath.parse(range.to)!.subtract(24, 'hours').toISOString(),
          to: range.to,
        });
      }
    };

    const canExtendTimeRange = Boolean(occurrencesRange?.from && occurrencesRange.to);
    const canAdjustSearchCriteria = isTimeBased || hasFilters || hasQuery;

    const body = canAdjustSearchCriteria ? (
      <>
        <FormattedMessage
          id="discover.noResults.suggestion.tryText"
          defaultMessage="Here are some things to try:"
        />
        <EuiSpacer size="xs" />
        <ul>
          {isTimeBased && (
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
    ) : (
      <NoResultsSuggestionDefault />
    );

    return (
      <EuiEmptyPrompt
        layout="horizontal"
        color="plain"
        icon={<NoResultsIllustration />}
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
          typeof occurrencesRange === 'undefined' ? (
            <EuiLoadingSpinner />
          ) : canExtendTimeRange ? (
            <EuiButton
              color="primary"
              fill
              onClick={expandTimeRange}
              isLoading={isLoading}
              data-test-subj="discoverNoResultsViewRecentMatches"
            >
              <FormattedMessage
                id="discover.noResults.suggestion.viewRecentMatchesButtonText"
                defaultMessage="View recent matches"
              />
            </EuiButton>
          ) : undefined
        }
      />
    );
  }
);
