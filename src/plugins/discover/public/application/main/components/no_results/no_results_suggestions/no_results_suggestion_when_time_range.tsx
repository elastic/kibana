/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiLink,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import { useFetchOccurrencesRange, type OccurrencesRange } from './use_fetch_occurances_range';

export interface Props {
  dataView: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
}
export const NoResultsSuggestionWhenTimeRange: React.FC<Props> = ({ dataView, query, filters }) => {
  const services = useDiscoverServices();
  const { data, uiSettings, timefilter } = services;

  // TODO: include pinned filters
  const occurrencesRange = useFetchOccurrencesRange({
    dataView,
    query,
    filters,
    services: {
      data,
      uiSettings,
    },
  });

  const expandTimeRange = useCallback(
    (range: OccurrencesRange) => {
      // TODO: refetch the range at this moment
      if (range.from && range.to) {
        timefilter.setTime({ from: range.from, to: range.to });
      }
    },
    [timefilter]
  );

  if (!occurrencesRange?.from || !occurrencesRange?.to) {
    return null;
  }

  return (
    <EuiDescriptionList compressed>
      <EuiDescriptionListTitle data-test-subj="discoverNoResultsTimefilter">
        <FormattedMessage
          id="discover.noResults.searchOverLongerPeriodTitle"
          defaultMessage="Search over a longer period of time"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <FormattedMessage
          id="discover.noResults.expandYourTimeRangeDescription"
          defaultMessage="{showAllLink} or change the current range via the time picker above."
          values={{
            showAllLink: (
              <EuiLink
                data-test-subj="discoverNoResultsShowAllOccurrences"
                onClick={() => expandTimeRange(occurrencesRange)}
              >
                <FormattedMessage
                  id="discover.noResults.findAllOccurrencesLinkText"
                  defaultMessage="Expand the time range to see all matches"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
};
