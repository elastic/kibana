import React, { Component, Fragment } from 'react';
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

    if (shardFailures) {
      const failures = shardFailures.map((failure, index) => (
        <div key={`${failure.index}${failure.shard}${failure.reason}`}>
          <EuiText size="xs">
            <strong>Index &lsquo;{failure.index}&rsquo;</strong>, shard &lsquo;{failure.shard}&rsquo;
          </EuiText>

          <EuiSpacer size="s" />

          <EuiCodeBlock paddingSize="s">
            {failure.reason}
          </EuiCodeBlock>

          {index < shardFailures.length - 1 ? <EuiSpacer size="l" /> : undefined}
        </div>
      ));

      shardFailuresMessage = (
        <Fragment>
          <EuiSpacer size="xl" />

          <EuiText>
            <h3>
              Address shard failures
            </h3>

            <p>
              The following shard failures occurred:
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
              Expand your time range
            </h3>

            <p>
              One or more of the indices you&rsquo;re looking at contains a date field. Your query may
              not match anything in the current time range, or there may not be any data at all in
              the currently selected time range. You can try {(
                <EuiLink
                  data-test-subj="discoverNoResultsTimefilter"
                  onClick={this.onClickTimePickerButton}
                  aria-expanded={isTimePickerOpen}
                >
                  opening the time picker
                </EuiLink>
              )} and changing the time range to one which contains data.
            </p>

          </EuiText>
        </Fragment>
      );
    }

    let luceneQueryMessage;

    if (queryLanguage === 'lucene') {
      const searchExamples = [{
        description: <EuiCode>200</EuiCode>,
        title: <EuiText><strong>Find requests that contain the number 200, in any field</strong></EuiText>,
      }, {
        description: <EuiCode>status:200</EuiCode>,
        title: <EuiText><strong>Find 200 in the status field</strong></EuiText>,
      }, {
        description: <EuiCode>status:[400 TO 499]</EuiCode>,
        title: <EuiText><strong>Find all status codes between 400-499</strong></EuiText>,
      }, {
        description: <EuiCode>status:[400 TO 499] AND extension:PHP</EuiCode>,
        title: <EuiText><strong>Find status codes 400-499 with the extension php</strong></EuiText>,
      }, {
        description: <EuiCode>status:[400 TO 499] AND (extension:php OR extension:html)</EuiCode>,
        title: <EuiText><strong>Find status codes 400-499 with the extension php or html</strong></EuiText>,
      }];

      luceneQueryMessage = (
        <Fragment>
          <EuiSpacer size="xl" />

          <EuiText>
            <h3>
              Refine your query
            </h3>

            <p>
              The search bar at the top uses Elasticsearch&rsquo;s support for Lucene {(
                <EuiLink
                  target="_blank"
                  href={getDocLink('query.luceneQuerySyntax')}
                >
                  Query String syntax
                </EuiLink>
              )}. Here are some examples of how you can search for web server logs that have been
              parsed into a few fields.
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
          <EuiFlexItem grow={false} className="discoverNoResults">
            <EuiCallOut
              title="No results match your search criteria"
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
