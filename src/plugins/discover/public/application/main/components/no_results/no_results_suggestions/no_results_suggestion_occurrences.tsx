/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import {
  useFetchOccurrencesRange,
  type State as OccurrencesRange,
} from './use_fetch_occurances_range';

export interface Props {
  dataView: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
}

export const NoResultsSuggestionOccurrences: React.FC<Props> = ({ dataView, filters, query }) => {
  const services = useDiscoverServices();
  const { data, uiSettings, timefilter } = services;

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
      if (range.from && range.to) {
        timefilter.setTime({ from: range.from, to: range.to });
      }
    },
    [timefilter]
  );

  if (!occurrencesRange.from || !occurrencesRange.to) {
    return null;
  }

  return (
    <EuiButton
      data-test-subj="discoverNoResultsOccurrences"
      onClick={() => expandTimeRange(occurrencesRange)}
    >
      <FormattedMessage
        id="discover.noResults.showAllMatchesText"
        defaultMessage="Find all occurrences"
      />
    </EuiButton>
  );
};
