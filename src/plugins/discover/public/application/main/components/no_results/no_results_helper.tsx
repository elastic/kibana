/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiLink,
  EuiDescriptionListDescription,
  EuiSpacer,
} from '@elastic/eui';

export function getTimeFieldMessage() {
  return (
    <Fragment>
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
    </Fragment>
  );
}

interface AdjustSearchProps {
  onDisableFilters: () => void;
  hasFilters?: boolean;
  hasQuery?: boolean;
}

export function AdjustSearch({ hasFilters, hasQuery, onDisableFilters }: AdjustSearchProps) {
  return (
    <Fragment>
      {hasQuery && (
        <>
          <EuiSpacer size="s" />
          <EuiDescriptionList compressed>
            <EuiDescriptionListTitle data-test-subj="discoverNoResultsAdjustSearch">
              <FormattedMessage
                id="discover.noResults.adjustSearch"
                defaultMessage="Adjust your query"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <FormattedMessage
                id="discover.noResults.trySearchingForDifferentCombination"
                defaultMessage="Try searching for a different combination of terms."
              />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </>
      )}
      {hasFilters && (
        <>
          <EuiSpacer size="s" />
          <EuiDescriptionList compressed>
            <EuiDescriptionListTitle data-test-subj="discoverNoResultsAdjustFilters">
              <FormattedMessage
                id="discover.noResults.adjustFilters"
                defaultMessage="Adjust your filters"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <FormattedMessage
                id="discover.noResults.tryRemovingOrDisablingFilters"
                defaultMessage="Try removing or {disablingFiltersLink}."
                values={{
                  disablingFiltersLink: (
                    <EuiLink
                      data-test-subj="discoverNoResultsDisableFilters"
                      onClick={onDisableFilters}
                    >
                      <FormattedMessage
                        id="discover.noResults.temporaryDisablingFiltersLinkText"
                        defaultMessage="temporarily disabling filters"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </>
      )}
    </Fragment>
  );
}
