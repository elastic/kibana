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

export function NoResultsSuggestionWhenQuery() {
  return (
    <EuiDescriptionList compressed>
      <EuiDescriptionListTitle data-test-subj="discoverNoResultsAdjustSearch">
        <FormattedMessage id="discover.noResults.adjustSearch" defaultMessage="Adjust your query" />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <FormattedMessage
          id="discover.noResults.tryUpdatingYourSearchQuery"
          defaultMessage="Try changing or clearing your search query."
        />
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}
