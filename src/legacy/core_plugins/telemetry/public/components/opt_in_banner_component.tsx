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
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { OptInMessage } from './opt_in_message';

interface Props {
  fetchTelemetry: () => Promise<any[]>;
  optInClick: (optIn: boolean) => void;
}

/**
 * React component for displaying the Telemetry opt-in banner.
 */
export class OptInBanner extends React.PureComponent<Props> {
  render() {
    const title = (
      <FormattedMessage
        id="telemetry.welcomeBanner.title"
        defaultMessage="Help us improve the Elastic Stack!"
      />
    );
    return (
      <EuiCallOut iconType="questionInCircle" title={title}>
        <OptInMessage fetchTelemetry={this.props.fetchTelemetry} />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={() => this.props.optInClick(true)}>
              <FormattedMessage id="telemetry.welcomeBanner.yesButtonLabel" defaultMessage="Yes" />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={() => this.props.optInClick(false)}>
              <FormattedMessage id="telemetry.welcomeBanner.noButtonLabel" defaultMessage="No" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
}
