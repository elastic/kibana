/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getServices } from '../../../kibana_services';
import { DataPublicPluginStart } from '../../../../../data/public';
import { getLuceneQueryMessage, getTimeFieldMessage } from './no_results_helper';
import './_no_results.scss';

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
      <EuiCallOut
        title={
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsMatchSearchCriteriaTitle"
            defaultMessage="No results match your search criteria"
          />
        }
        color="warning"
        iconType="help"
        data-test-subj="discoverNoResults"
      />
      {timeFieldName ? getTimeFieldMessage() : null}
      {queryLanguage === 'lucene'
        ? getLuceneQueryMessage(getServices().docLinks.links.query.luceneQuerySyntax)
        : null}
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
