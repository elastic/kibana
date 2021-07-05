/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

export function getTimeFieldMessage() {
  return (
    <Fragment>
      <EuiTitle size="xs">
        <h3 data-test-subj="discoverNoResultsTimefilter">
          <FormattedMessage
            id="discover.noResults.expandYourTimeRangeTitle"
            defaultMessage="Expand your time range"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="discover.noResults.queryMayNotMatchTitle"
            defaultMessage="One or more of the indices you&rsquo;re looking at contains a date field. Your query may
                  not match anything in the current time range, or there may not be any data at all in
                  the currently selected time range. You can try changing the time range to one which contains data."
          />
        </p>
      </EuiText>
    </Fragment>
  );
}

interface AdjustSearchProps {
  onDisableFilters: () => void;
  hasFilters?: boolean;
}

export function AdjustSearch({ hasFilters, onDisableFilters }: AdjustSearchProps) {
  return (
    <Fragment>
      <EuiTitle size="xs">
        <h3 data-test-subj="discoverNoResultsAdjustSearch">
          <FormattedMessage
            id="discover.noResults.adjustSearch"
            defaultMessage="Adjust your search"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText grow={false}>
        <p>
          <FormattedMessage
            id="discover.noResults.adjustSearchDescription"
            defaultMessage="You have filtered down your result on the top of the screen.
              Changing your search or filters might reveal more documents."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {hasFilters && (
        <div>
          <EuiButton data-test-subj="discoverNoResultsDisableFilters" onClick={onDisableFilters}>
            <FormattedMessage
              id="discover.noResults.disableFilters"
              defaultMessage="Temporarily disable all filters"
            />
          </EuiButton>
        </div>
      )}
    </Fragment>
  );
}
