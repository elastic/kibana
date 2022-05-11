/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

export function NoResultsSuggestionWhenTimeRange() {
  return (
    <EuiDescriptionList compressed>
      <EuiDescriptionListTitle data-test-subj="discoverNoResultsTimefilter">
        <FormattedMessage
          id="discover.noResults.expandYourTimeRangeTitle"
          defaultMessage="Expand your time range"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <FormattedMessage
          id="discover.noResults.queryMayNotMatchTitle"
          defaultMessage="Try searching over a longer period of time."
        />
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}
