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
  EuiLink,
  EuiDescriptionListDescription,
  EuiSpacer,
} from '@elastic/eui';

interface AdjustSearchProps {
  hasFilters?: boolean;
  hasQuery?: boolean;
  isTimeBased?: boolean;
  onDisableFilters: () => void;
}

export function AdjustSearch({
  isTimeBased,
  hasFilters,
  hasQuery,
  onDisableFilters,
}: AdjustSearchProps) {
  const canAdjustSearchParams = isTimeBased || hasFilters || hasQuery;

  if (canAdjustSearchParams) {
    return (
      <>
        {isTimeBased && <AdjustTimeField />}
        {hasQuery && <AdjustQuery />}
        {hasFilters && <AdjustFilters onDisableFilters={onDisableFilters} />}
      </>
    );
  }

  return <AdjustIndices />;
}

function AdjustTimeField() {
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

function AdjustQuery() {
  return (
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
  );
}

function AdjustFilters({ onDisableFilters }: Pick<AdjustSearchProps, 'onDisableFilters'>) {
  return (
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
  );
}

function AdjustIndices() {
  return (
    <EuiDescriptionList compressed>
      <EuiDescriptionListDescription data-test-subj="discoverNoResultsIndices">
        <FormattedMessage
          id="discover.noResults.noDocumentsOrPermissionsText"
          defaultMessage="Make sure you have permission to view the indices and that they contain documents."
        />
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
}
