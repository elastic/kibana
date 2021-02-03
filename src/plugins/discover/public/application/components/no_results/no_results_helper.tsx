/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode, EuiDescriptionList, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

export function getTimeFieldMessage() {
  return (
    <Fragment>
      <EuiSpacer size="xl" />
      <EuiText>
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
      <EuiSpacer size="xl" />
      <EuiText data-test-subj="discoverNoResultsLucene">
        <h3>
          <FormattedMessage
            id="discover.noResults.searchExamples.refineYourQueryTitle"
            defaultMessage="Refine your query"
          />
        </h3>
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
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" listItems={searchExamples} />
      <EuiSpacer size="xl" />
    </Fragment>
  );
}
