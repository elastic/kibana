/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  // EuiButton,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiLink,
  // EuiSpacer,
  // EuiText,
  EuiDescriptionListDescription,
  // EuiTitle,
} from '@elastic/eui';

export function getTimeFieldMessage() {
  return (
    <Fragment>
      <EuiDescriptionList>
        <EuiDescriptionListTitle data-test-subj="discoverNoResultsTimefilter">
          <FormattedMessage
            id="discover.noResults.expandYourTimeRangeTitle"
            defaultMessage="Expand your time range"
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <FormattedMessage
            id="discover.noResults.queryMayNotMatchTitle"
            defaultMessage="You are searching time series data and no matches were found in the specified time range. Try searching over a larger period of time."
          />
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </Fragment>
  );
}

interface AdjustSearchProps {
  onDisableFilters: () => void;
  hasFilters?: boolean;
  hasQuery?: boolean;
}

export function AdjustSearch({ hasFilters, hasQuery, onDisableFilters }: AdjustSearchProps) {
  let content: ReactNode;
  if (hasFilters) {
    if (hasQuery) {
      content = (
        <EuiDescriptionListDescription>
          You have entered a query and have narrowed your search results. Try searching for a
          different combination of terms or{' '}
          <EuiLink onClick={onDisableFilters}>
            <FormattedMessage
              id="discover.noResults.disableFilters"
              defaultMessage="temporarily disabling filters"
            />
          </EuiLink>{' '}
          to reveal more matches.
        </EuiDescriptionListDescription>
      );
    } else {
      content = (
        <EuiDescriptionListDescription>
          You have narrowed your search results. Try{' '}
          <EuiLink data-test-subj="discoverNoResultsDisableFilters" onClick={onDisableFilters}>
            <FormattedMessage
              id="discover.noResults.disableFilters"
              defaultMessage="temporarily disabling filters"
            />
          </EuiLink>{' '}
          to reveal more matches.
        </EuiDescriptionListDescription>
      );
    }
  } else {
    content = (
      <EuiDescriptionListDescription>
        <p>
          <FormattedMessage
            id="discover.noResults.queryOnlyDescription"
            defaultMessage="Try searching for a different combination of terms
            to reveal more matches."
          />
        </p>
      </EuiDescriptionListDescription>
    );
  }
  return (
    <Fragment>
      <EuiDescriptionList>
        <EuiDescriptionListTitle data-test-subj="discoverNoResultsAdjustSearch">
          <FormattedMessage
            id="discover.noResults.adjustSearch"
            defaultMessage="Adjust your search"
          />
        </EuiDescriptionListTitle>
        {content}
      </EuiDescriptionList>
    </Fragment>
  );
}
