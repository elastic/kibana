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

interface AdjustSearchProps {
  onDisableFilters: () => void;
  onOpenDatePicker: () => void;
  onEditSearch: () => void;
  isTimeBased?: boolean;
  hasFilters?: boolean;
  hasQuery?: boolean;
}

export function AdjustSearch({
  isTimeBased,
  hasFilters,
  hasQuery,
  onDisableFilters,
  onOpenDatePicker,
  onEditSearch,
}: AdjustSearchProps) {
  return (
    <Fragment>
      {isTimeBased && (
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
              defaultMessage="Try {openDatePickerLink}."
              values={{
                openDatePickerLink: (
                  <EuiLink data-test-subj="discoverBadTimeRange" onClick={onOpenDatePicker}>
                    <FormattedMessage
                      id="discover.noResults.badTimeRange"
                      defaultMessage="searching over a longer period of time"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      )}
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
                defaultMessage="Try {searchLink}."
                values={{
                  searchLink: (
                    <EuiLink
                      data-test-subj="discoverNoResultsDisableFilters"
                      onClick={onEditSearch}
                    >
                      <FormattedMessage
                        id="discover.noResults.temporaryDisablingFiltersLinkText"
                        defaultMessage="searching for a different combination of terms"
                      />
                    </EuiLink>
                  ),
                }}
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
                defaultMessage="Try {disablingFiltersLink}."
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
