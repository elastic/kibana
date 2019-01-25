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

import React, { Component, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';

import {
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

export class DiscoverNoResults extends Component {
  static propTypes = {
    shardFailures: PropTypes.array,
    timeFieldName: PropTypes.string,
    queryLanguage: PropTypes.string,
    isTimePickerOpen: PropTypes.bool.isRequired,
    getDocLink: PropTypes.func.isRequired,
    topNavToggle: PropTypes.func.isRequired,
  };

  onClickTimePickerButton = () => {
    this.props.topNavToggle('filter');
  };

  render() {
    const {
      shardFailures,
      timeFieldName,
      queryLanguage,
      getDocLink,
      isTimePickerOpen,
    } = this.props;

    let shardFailuresMessage;

    if (shardFailures && shardFailures.length) {
      const failures = shardFailures.map((failure, index) => (
        <div key={`${failure.index}${failure.shard}${failure.reason}`}>
          <EuiText size="xs">
            <FormattedMessage
              id="kbn.discover.noResults.indexFailureShardText"
              defaultMessage="{index}, shard {failureShard}"
              values={{
                index: (
                  <strong>
                    <FormattedMessage
                      id="kbn.discover.noResults.indexFailureIndexText"
                      defaultMessage="Index {failureIndex}"
                      values={{
                        failureIndex: `&lsquo;${failure.index}&rsquo;`,
                      }}
                    />
                  </strong>
                ),
                failureShard: `&lsquo;${failure.shard}&rsquo;`,
              }}
            />
          </EuiText>

          <EuiSpacer size="s" />

          <EuiCodeBlock paddingSize="s">
            {JSON.stringify(failure.reason)}
          </EuiCodeBlock>

          {index < shardFailures.length - 1 ? <EuiSpacer size="l" /> : undefined}
        </div>
      ));

      shardFailuresMessage = (
        <Fragment>
          <EuiSpacer size="xl" />

          <EuiText>
            <h3>
              <FormattedMessage
                id="kbn.discover.noResults.addressShardFailuresTitle"
                defaultMessage="Address shard failures"
              />
            </h3>

            <p>
              <FormattedMessage
                id="kbn.discover.noResults.shardFailuresDescription"
                defaultMessage="The following shard failures occurred:"
              />
            </p>

            {failures}
          </EuiText>
        </Fragment>
      );
    }

    let timeFieldMessage;

    if (timeFieldName) {
      timeFieldMessage = (
        <Fragment>
          <EuiSpacer size="xl" />

          <EuiText>
            <h3>
              <FormattedMessage
                id="kbn.discover.noResults.expandYourTimeRangeTitle"
                defaultMessage="Expand your time range"
              />
            </h3>

            <p>
              <FormattedMessage
                id="kbn.discover.noResults.queryMayNotMatchTitle"
                defaultMessage="One or more of the indices you&rsquo;re looking at contains a date field. Your query may
                  not match anything in the current time range, or there may not be any data at all in
                  the currently selected time range. You can try {timepickerLink} and changing the time range to one which contains data."
                values={{
                  timepickerLink: (
                    <EuiLink
                      data-test-subj="discoverNoResultsTimefilter"
                      onClick={this.onClickTimePickerButton}
                      aria-expanded={isTimePickerOpen}
                    >
                      <FormattedMessage
                        id="kbn.discover.noResults.openingTimepickerLinkText"
                        defaultMessage="opening the time picker"
                      />
                    </EuiLink>
                  )
                }}
              />
            </p>

          </EuiText>
        </Fragment>
      );
    }

    let luceneQueryMessage;

    if (queryLanguage === 'lucene') {
      const searchExamples = [{
        description: <EuiCode>200</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="kbn.discover.noResults.searchExamples.anyField200StatusCodeExampleTitle"
                defaultMessage="Find requests that contain the number 200, in any field"
              />
            </strong>
          </EuiText>
        ),
      }, {
        description: <EuiCode>status:200</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="kbn.discover.noResults.searchExamples.statusField200StatusCodeExampleTitle"
                defaultMessage="Find 200 in the status field"
              />
            </strong>
          </EuiText>
        ),
      }, {
        description: <EuiCode>status:[400 TO 499]</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="kbn.discover.noResults.searchExamples.400to499StatusCodeExampleTitle"
                defaultMessage="Find all status codes between 400-499"
              />
            </strong>
          </EuiText>
        ),
      }, {
        description: <EuiCode>status:[400 TO 499] AND extension:PHP</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="kbn.discover.noResults.searchExamples.400to499StatusCodeWithPhpExtensionExampleTitle"
                defaultMessage="Find status codes 400-499 with the extension php"
              />
            </strong>
          </EuiText>
        ),
      }, {
        description: <EuiCode>status:[400 TO 499] AND (extension:php OR extension:html)</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="kbn.discover.noResults.searchExamples.400to499StatusCodeWithPhpOrHtmlExtensionExampleTitle"
                defaultMessage="Find status codes 400-499 with the extension php or html"
              />
            </strong>
          </EuiText>
        ),
      }];

      luceneQueryMessage = (
        <Fragment>
          <EuiSpacer size="xl" />

          <EuiText>
            <h3>
              <FormattedMessage
                id="kbn.discover.noResults.searchExamples.refineYourQueryTitle"
                defaultMessage="Refine your query"
              />
            </h3>

            <p>
              <FormattedMessage
                id="kbn.discover.noResults.searchExamples.howTosearchForWebServerLogsDescription"
                defaultMessage="The search bar at the top uses Elasticsearch&rsquo;s support for Lucene {queryStringSyntaxLink}.
                Here are some examples of how you can search for web server logs that have been parsed into a few fields."
                values={{
                  queryStringSyntaxLink: (
                    <EuiLink
                      target="_blank"
                      href={getDocLink('query.luceneQuerySyntax')}
                    >
                      <FormattedMessage
                        id="kbn.discover.noResults.searchExamples.queryStringSyntaxLinkText"
                        defaultMessage="Query String syntax"
                      />
                    </EuiLink>
                  )
                }}
              />
            </p>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiDescriptionList
            type="column"
            listItems={searchExamples}
          />

          <EuiSpacer size="xl" />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiSpacer size="xl" />

        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false} className="dscNoResults">
            <EuiCallOut
              title={<FormattedMessage
                id="kbn.discover.noResults.searchExamples.noResultsMatchSearchCriteriaTitle"
                defaultMessage="No results match your search criteria"
              />}
              color="warning"
              iconType="help"
              data-test-subj="discoverNoResults"
            />

            {shardFailuresMessage}
            {timeFieldMessage}
            {luceneQueryMessage}
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }
}
