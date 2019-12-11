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
import PropTypes from 'prop-types';
import {
  EuiCallOut,
  EuiPanel,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { PRIVACY_STATEMENT_URL } from '../../common/constants';
import { OptInExampleFlyout } from './opt_in_details_component';
import { Field } from 'ui/management';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const SEARCH_TERMS = ['telemetry', 'usage', 'data', 'usage data'];

export class TelemetryForm extends Component {
  static propTypes = {
    telemetryOptInProvider: PropTypes.object.isRequired,
    query: PropTypes.object,
    onQueryMatchChange: PropTypes.func.isRequired,
    showAppliesSettingMessage: PropTypes.bool.isRequired,
    enableSaving: PropTypes.bool.isRequired,
  };

  state = {
    processing: false,
    showExample: false,
    queryMatches: null,
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const {
      query
    } = nextProps;

    const searchTerm = (query.text || '').toLowerCase();
    const searchTermMatches = SEARCH_TERMS.some(term => term.indexOf(searchTerm) >= 0);

    if (searchTermMatches !== this.state.queryMatches) {
      this.setState({
        queryMatches: searchTermMatches
      }, () => {
        this.props.onQueryMatchChange(searchTermMatches);
      });
    }
  }

  render() {
    const {
      telemetryOptInProvider,
    } = this.props;

    const {
      showExample,
      queryMatches,
    } = this.state;

    if (!telemetryOptInProvider.canChangeOptInStatus()) {
      return null;
    }

    if (queryMatches !== null && !queryMatches) {
      return null;
    }

    return (
      <Fragment>
        {showExample &&
          <OptInExampleFlyout
            fetchTelemetry={() => telemetryOptInProvider.fetchExample()}
            onClose={this.toggleExample}
          />
        }
        <EuiPanel paddingSize="l">
          <EuiForm>
            <EuiText>
              <EuiFlexGroup alignItems="baseline">
                <EuiFlexItem grow={false}>
                  <h2>
                    <FormattedMessage
                      id="telemetry.usageDataTitle"
                      defaultMessage="Usage Data"
                    />
                  </h2>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>

            {this.maybeGetAppliesSettingMessage()}
            <EuiSpacer size="s" />
            <Field
              setting={{
                type: 'boolean',
                value: telemetryOptInProvider.getOptIn() || false,
                description: this.renderDescription(),
                defVal: true,
                ariaName: i18n.translate('telemetry.provideUsageStatisticsLabel', { defaultMessage: 'Provide usage statistics' })
              }}
              save={this.toggleOptIn}
              clear={this.toggleOptIn}
              enableSaving={this.props.enableSaving}
            />
          </EuiForm>
        </EuiPanel>
      </Fragment>
    );
  }

  maybeGetAppliesSettingMessage = () => {
    if (!this.props.showAppliesSettingMessage) {
      return null;
    }
    return (
      <EuiCallOut
        color="primary"
        iconType="spacesApp"
        title={
          <p>
            <FormattedMessage
              id="telemetry.callout.appliesSettingTitle"
              defaultMessage="This setting applies to {allOfKibanaText}"
              values={{
                allOfKibanaText: (
                  <strong>
                    <FormattedMessage
                      id="telemetry.callout.appliesSettingTitle.allOfKibanaText"
                      defaultMessage="all of Kibana."
                    />
                  </strong>
                )
              }}
            />
          </p>
        }
      />
    );
  }

  renderDescription = () => (
    <Fragment>
      <p>
        <FormattedMessage
          id="telemetry.telemetryConfigAndLinkDescription"
          defaultMessage="Enabling data usage collection helps us manage and improve our products and services.
          See our {privacyStatementLink} for more details."
          values={{
            privacyStatementLink: (
              <EuiLink href={PRIVACY_STATEMENT_URL} target="_blank">
                <FormattedMessage
                  id="telemetry.readOurUsageDataPrivacyStatementLinkText"
                  defaultMessage="Privacy Statement"
                />
              </EuiLink>
            )
          }}
        />
      </p>
      <p>
        <EuiLink onClick={this.toggleExample}>
          <FormattedMessage
            id="telemetry.seeExampleOfWhatWeCollectLinkText"
            defaultMessage="See an example of what we collect"
          />
        </EuiLink>
      </p>
    </Fragment>
  )

  toggleOptIn = async () => {
    const newOptInValue = !this.props.telemetryOptInProvider.getOptIn();

    return new Promise((resolve, reject) => {
      this.setState({
        enabled: newOptInValue,
        processing: true
      }, () => {
        this.props.telemetryOptInProvider.setOptIn(newOptInValue).then(() => {
          this.setState({ processing: false });
          resolve();
        }, (e) => {
          // something went wrong
          this.setState({ processing: false });
          reject(e);
        });
      });
    });

  }

  toggleExample = () => {
    this.setState({
      showExample: !this.state.showExample
    });
  }
}
