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
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { DataPublicPluginStart } from '../../../../../../data/public';
import { NoResultsSuggestions } from './no_results_suggestions';
import './_no_results.scss';
import { NoResultsIllustration } from './assets/no_results_illustration';

export interface DiscoverNoResultsProps {
  isTimeBased?: boolean;
  error?: Error;
  data?: DataPublicPluginStart;
  hasQuery?: boolean;
  hasFilters?: boolean;
  onDisableFilters: () => void;
}

export function DiscoverNoResults({
  isTimeBased,
  error,
  data,
  hasFilters,
  hasQuery,
  onDisableFilters,
}: DiscoverNoResultsProps) {
  const callOut = !error ? (
    <EuiFlexItem grow={false} className="dscNoResults">
      <EuiTitle className="dscNoResults__title">
        <h2 data-test-subj="discoverNoResults">
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsMatchSearchCriteriaTitle"
            defaultMessage="No results match your search criteria"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem className="dscNoResults__illustration" grow={1}>
          <NoResultsIllustration />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <NoResultsSuggestions
            isTimeBased={isTimeBased}
            hasFilters={hasFilters}
            hasQuery={hasQuery}
            onDisableFilters={onDisableFilters}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  ) : (
    <EuiFlexItem grow={true} className="dscNoResults">
      <EuiCallOut
        title={
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsBecauseOfError"
            defaultMessage="We encountered an error retrieving search results"
          />
        }
        color="danger"
        iconType="alert"
        data-test-subj="discoverNoResultsError"
      >
        <EuiButton
          size="s"
          color="danger"
          onClick={() => (data ? data.search.showError(error) : void 0)}
        >
          <FormattedMessage
            id="discover.showErrorMessageAgain"
            defaultMessage="Show error message"
          />
        </EuiButton>
      </EuiCallOut>
    </EuiFlexItem>
  );

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="center">{callOut}</EuiFlexGroup>
    </Fragment>
  );
}
