/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { getServices } from '../../../../../kibana_services';
import { DataPublicPluginStart } from '../../../../../../../data/public';
import { getLuceneQueryMessage, getTimeFieldMessage } from './no_results_helper';
import './_no_results.scss';
import { Illustration } from './assets/no_results_illustration';

export interface DiscoverNoResultsProps {
  timeFieldName?: string;
  queryLanguage?: string;
  error?: Error;
  data?: DataPublicPluginStart;
}

export function DiscoverNoResults({
  timeFieldName,
  queryLanguage,
  error,
  data,
}: DiscoverNoResultsProps) {
  const callOut = !error ? (
    <EuiFlexItem grow={false} className="dscNoResults">
      <EuiText>
        <h2 data-test-subj="discoverNoResults">
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsMatchSearchCriteriaTitle"
            defaultMessage="No results match your search criteria"
          />
        </h2>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="dscNoResults__illustration">
          <Illustration />
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="dscNoResults__text">
          {timeFieldName ? getTimeFieldMessage() : null}
          {queryLanguage === 'lucene'
            ? getLuceneQueryMessage(getServices().docLinks.links.query.luceneQuerySyntax)
            : null}
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
