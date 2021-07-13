/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

export function getTimeFieldMessage() {
  return (
    <Fragment>
      {/* <EuiTitle size="xs">
        <h3 data-test-subj="discoverNoResultsTimefilter">
          <FormattedMessage
            id="discover.noResults.expandYourTimeRangeTitle"
            defaultMessage="Expand your time range"
          />
        </h3>
      </EuiTitle> */}
      <EuiSpacer size="m" />
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="discover.noResults.queryMayNotMatchTitle"
            defaultMessage="You are searching time series data, try searching over a larger period of time."
          />
        </p>
      </EuiText>
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
        <EuiText grow={false}>
          You have narrowed your search results. Try searching for a different combination of terms
          or{' '}
          <EuiLink onClick={onDisableFilters}>
            <FormattedMessage
              id="discover.noResults.disableFilters"
              defaultMessage="removing filters"
            />
          </EuiLink>{' '}
          to reveal more matches.
        </EuiText>
      );
    } else {
      content = (
        <EuiText grow={false}>
          You have narrowed your search results. Try{' '}
          <EuiLink data-test-subj="discoverNoResultsDisableFilters" onClick={onDisableFilters}>
            <FormattedMessage
              id="discover.noResults.disableFilters"
              defaultMessage="removing filters"
            />
          </EuiLink>{' '}
          to reveal more matches.
        </EuiText>
      );
    }
  } else {
    content = (
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="discover.noResults.queryOnlyDescription"
            defaultMessage="You have narrowed your search results. Try searching for a different combination of terms
            to reveal more matches."
          />
        </p>
      </EuiText>
    );
  }
  return <Fragment>{content}</Fragment>;
}
