/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import { TimeRangeExtendingStatus } from './use_fetch_occurances_range';

export const NoResultsSuggestionWhenTimeRange: React.FC<{
  timeRangeExtendingStatus?: TimeRangeExtendingStatus;
}> = ({ timeRangeExtendingStatus }) => {
  const message = (
    <FormattedMessage
      id="discover.noResults.suggestion.expandTimeRangeText"
      defaultMessage="Expand the time range"
    />
  );
  return (
    <EuiText data-test-subj="discoverNoResultsTimefilter">
      {timeRangeExtendingStatus === TimeRangeExtendingStatus.succeedWithoutResults ? (
        <>
          <s>{message}</s>
          <span data-test-subj="discoverSearchAllMatchesGivesNoResults">
            {' ('}
            <FormattedMessage
              id="discover.noResults.suggestion.expandTimeRangeGivesNoResultsText"
              defaultMessage="No results"
            />
            {')'}
          </span>
        </>
      ) : (
        message
      )}
    </EuiText>
  );
};
