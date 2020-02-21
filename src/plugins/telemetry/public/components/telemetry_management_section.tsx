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

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { PRIVACY_STATEMENT_URL } from '../../common/constants';
import { OptInExampleFlyout } from './opt_in_example_flyout';
// @ts-ignore
import { Field } from '../../../advanced_settings/public';
import { TelemetryService } from '../services/telemetry_service';
const SEARCH_TERMS = ['telemetry', 'usage', 'data', 'usage data'];

interface Props {
  telemetryService: TelemetryService;
  onQueryMatchChange: (searchTermMatches: boolean) => void;
  showAppliesSettingMessage: boolean;
  enableSaving: boolean;
  query?: any;
}

interface State {
  processing: boolean;
  showExample: boolean;
  queryMatches: boolean | null;
}

export class TelemetryManagementSection extends Component<Props, State> {
  state: State = {
    processing: false,
    showExample: false,
    queryMatches: null,
  };

  UNSAFE_componentWillReceiveProps(nextProps: Props) {
    const { query } = nextProps;

    const searchTerm = (query.text || '').toLowerCase();
    const searchTermMatches = SEARCH_TERMS.some(term => term.indexOf(searchTerm) >= 0);

    if (searchTermMatches !== this.state.queryMatches) {
      this.setState(
        {
          queryMatches: searchTermMatches,
        },
        () => {
          this.props.onQueryMatchChange(searchTermMatches);
        }
      );
    }
  }

  render() {
    const { telemetryService } = this.props;
    const { showExample, queryMatches } = this.state;

    if (!telemetryService.getCanChangeOptInStatus()) {
      return null;
    }

    if (queryMatches !== null && !queryMatches) {
      return null;
    }

    return (
      <Fragment>
        {showExample && (
          <OptInExampleFlyout
            fetchExample={telemetryService.fetchExample}
            onClose={this.toggleExample}
          />
        )}
        <EuiPanel paddingSize="l">
          <EuiForm>
            <EuiText>
              <EuiFlexGroup alignItems="baseline">
                <EuiFlexItem grow={false}>
                  <h2>
                    <FormattedMessage id="telemetry.usageDataTitle" defaultMessage="Usage Data" />
                  </h2>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>

            {this.maybeGetAppliesSettingMessage()}
            <EuiSpacer size="s" />
            <Field
              setting={
                {
                  type: 'boolean',
                  name: 'telemetry:enabled',
                  displayName: i18n.translate('telemetry.provideUsageStatisticsTitle', {
                    defaultMessage: 'Provide usage statistics',
                  }),
                  value: telemetryService.getIsOptedIn(),
                  description: this.renderDescription(),
                  defVal: true,
                  ariaName: i18n.translate('telemetry.provideUsageStatisticsAriaName', {
                    defaultMessage: 'Provide usage statistics',
                  }),
                } as any
              }
              dockLinks={null as any}
              toasts={null as any}
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
                ),
              }}
            />
          </p>
        }
      />
    );
  };

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
            ),
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
  );

  toggleOptIn = async (): Promise<boolean> => {
    const { telemetryService } = this.props;
    const newOptInValue = !telemetryService.getIsOptedIn();

    return new Promise((resolve, reject) => {
      this.setState({ processing: true }, async () => {
        try {
          await telemetryService.setOptIn(newOptInValue);
          this.setState({ processing: false });
          resolve(true);
        } catch (err) {
          this.setState({ processing: false });
          reject(err);
        }
      });
    });
  };

  toggleExample = () => {
    this.setState({
      showExample: !this.state.showExample,
    });
  };
}
