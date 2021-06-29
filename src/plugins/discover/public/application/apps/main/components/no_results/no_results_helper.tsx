/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiCode,
  EuiDescriptionList,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Illustration } from './assets/no_results_illustration';

export function getTimeFieldMessage() {
  return (
    <Fragment>
      <EuiText>
        <h1 data-test-subj="discoverNoResults">
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsMatchSearchCriteriaTitle"
            defaultMessage="No results match your search criteria"
          />
        </h1>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="inpEmptyIndexPatternPrompt__illustration">
          <Illustration />
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="inpEmptyIndexPatternPrompt__text">
          <EuiText grow={false}>
            <h2 data-test-subj="discoverNoResultsTimefilter">
              <FormattedMessage
                id="discover.noResults.expandYourTimeRangeTitle"
                defaultMessage="Expand your time range"
              />
            </h2>
            <p>
              <FormattedMessage
                id="discover.noResults.queryMayNotMatchTitle"
                defaultMessage="One or more of the indices you&rsquo;re looking at contains a date field. Your query may
                  not match anything in the current time range, or there may not be any data at all in
                  the currently selected time range. You can try changing the time range to one which contains data."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}

export function getLuceneQueryMessage(link: string) {
  const searchExamples = [
    {
      description: <EuiCode>200</EuiCode>,
      title: (
        <EuiText>
          <strong>
            <FormattedMessage
              id="discover.noResults.searchExamples.anyField200StatusCodeExampleTitle"
              defaultMessage="Find requests that contain the number 200, in any field"
            />
          </strong>
        </EuiText>
      ),
    },
    {
      description: <EuiCode>status:200</EuiCode>,
      title: (
        <EuiText>
          <strong>
            <FormattedMessage
              id="discover.noResults.searchExamples.statusField200StatusCodeExampleTitle"
              defaultMessage="Find 200 in the status field"
            />
          </strong>
        </EuiText>
      ),
    },
    {
      description: <EuiCode>status:[400 TO 499]</EuiCode>,
      title: (
        <EuiText>
          <strong>
            <FormattedMessage
              id="discover.noResults.searchExamples.400to499StatusCodeExampleTitle"
              defaultMessage="Find all status codes between 400-499"
            />
          </strong>
        </EuiText>
      ),
    },
    {
      description: <EuiCode>status:[400 TO 499] AND extension:PHP</EuiCode>,
      title: (
        <EuiText>
          <strong>
            <FormattedMessage
              id="discover.noResults.searchExamples.400to499StatusCodeWithPhpExtensionExampleTitle"
              defaultMessage="Find status codes 400-499 with the extension php"
            />
          </strong>
        </EuiText>
      ),
    },
    {
      description: <EuiCode>status:[400 TO 499] AND (extension:php OR extension:html)</EuiCode>,
      title: (
        <EuiText>
          <strong>
            <FormattedMessage
              id="discover.noResults.searchExamples.400to499StatusCodeWithPhpOrHtmlExtensionExampleTitle"
              defaultMessage="Find status codes 400-499 with the extension php or html"
            />
          </strong>
        </EuiText>
      ),
    },
  ];
  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiText data-test-subj="discoverNoResultsLucene">
        <h2>
          <FormattedMessage
            id="discover.noResults.searchExamples.refineYourQueryTitle"
            defaultMessage="Refine your query"
          />
        </h2>
        <p>
          <FormattedMessage
            id="discover.noResults.searchExamples.howTosearchForWebServerLogsDescription"
            defaultMessage="The search bar at the top uses Elasticsearch&rsquo;s support for Lucene {queryStringSyntaxLink}.
                Here are some examples of how you can search for web server logs that have been parsed into a few fields."
            values={{
              queryStringSyntaxLink: (
                <EuiLink target="_blank" href={link}>
                  <FormattedMessage
                    id="discover.noResults.searchExamples.queryStringSyntaxLinkText"
                    defaultMessage="Query String syntax"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiDescriptionList type="column" listItems={searchExamples} />
      <EuiSpacer size="xl" />
    </Fragment>
  );
}
