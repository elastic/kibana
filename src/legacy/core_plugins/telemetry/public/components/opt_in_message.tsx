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

import * as React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { getConfigTelemetryDesc, PRIVACY_STATEMENT_URL } from '../../common/constants';
import { OptInExampleFlyout } from './opt_in_details_component';

interface Props {
  fetchTelemetry: () => Promise<any[]>;
}

interface State {
  showDetails: boolean;
  showExample: boolean;
}

export class OptInMessage extends React.PureComponent<Props, State> {
  public readonly state: State = {
    showDetails: false,
    showExample: false,
  };

  toggleShowExample = () => {
    this.setState(prevState => ({
      showExample: !prevState.showExample,
    }));
  };

  render() {
    const { showDetails, showExample } = this.state;

    const getDetails = () => (
      <EuiText size="s">
        <p tab-index="0">
          <FormattedMessage
            id="telemetry.welcomeBanner.telemetryConfigDetailsDescription"
            defaultMessage="No information about the data you process or store will be sent. This feature
              will periodically send basic feature usage statistics. See an {exampleLink} or read our {telemetryPrivacyStatementLink}.
              You can disable this feature at any time."
            values={{
              exampleLink: (
                <EuiLink onClick={this.toggleShowExample}>
                  <FormattedMessage
                    id="telemetry.welcomeBanner.telemetryConfigDetailsDescription.exampleLinkText"
                    defaultMessage="example"
                  />
                </EuiLink>
              ),
              telemetryPrivacyStatementLink: (
                <EuiLink href={PRIVACY_STATEMENT_URL} target="_blank">
                  <FormattedMessage
                    id="telemetry.welcomeBanner.telemetryConfigDetailsDescription.telemetryPrivacyStatementLinkText"
                    defaultMessage="telemetry privacy statement"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    );

    const getFlyoutDetails = () => (
      <OptInExampleFlyout
        onClose={() => this.setState({ showExample: false })}
        fetchTelemetry={this.props.fetchTelemetry}
      />
    );

    const getReadMore = () => (
      <EuiLink onClick={() => this.setState({ showDetails: true })}>
        <FormattedMessage
          id="telemetry.welcomeBanner.telemetryConfigDescription.readMoreLinkText"
          defaultMessage="Read more"
        />
      </EuiLink>
    );

    return (
      <React.Fragment>
        <EuiText>
          <p tab-index="0">
            {getConfigTelemetryDesc()} {!showDetails && getReadMore()}
          </p>
        </EuiText>
        {showDetails && getDetails()}
        {showDetails && showExample && getFlyoutDetails()}
      </React.Fragment>
    );
  }
}
