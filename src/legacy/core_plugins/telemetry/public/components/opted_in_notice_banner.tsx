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
import { EuiButton, EuiLink, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  dismiss: () => Promise<any[]>;
}

/**
 * React component for displaying the Telemetry opt-in banner.
 */
export class OptedInBanner extends React.PureComponent<Props> {
  render() {
    return (
      <EuiCallOut title="Help us improve the Elastic Stack">
        <FormattedMessage
          id="telemetry.telemetryOptedInNoticeDescription"
          defaultMessage="To learn about how usage data helps us manage and improve our products and services, see our {privacyStatementLink}. To stop collection, {disableLink}."
          values={{
            privacyStatementLink: (
              <EuiLink href="#" target="_blank">
                <FormattedMessage
                  id="telemetry.telemetryOptedInPrivacyStatement"
                  defaultMessage="Privacy Statement"
                />
              </EuiLink>
            ),
            disableLink: (
              <EuiLink href="#" target="_blank">
                <FormattedMessage
                  id="telemetry.telemetryOptedInDisableUsage"
                  defaultMessage="disable usage data here"
                />
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="s" />
        <EuiButton size="s" onClick={this.props.dismiss}>
          <FormattedMessage
            id="telemetry.welcomeBanner.enableButtonLabel"
            defaultMessage="Dismiss"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }
}
