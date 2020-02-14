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

/* eslint @elastic/eui/href-or-on-click:0 */

import * as React from 'react';
import { EuiButton, EuiLink, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { PATH_TO_ADVANCED_SETTINGS, PRIVACY_STATEMENT_URL } from '../../common/constants';

interface Props {
  onSeenBanner: () => any;
}

export class OptedInNoticeBanner extends React.PureComponent<Props> {
  render() {
    const { onSeenBanner } = this.props;
    const bannerTitle = i18n.translate('telemetry.telemetryOptedInNoticeTitle', {
      defaultMessage: 'Help us improve the Elastic Stack',
    });

    return (
      <EuiCallOut title={bannerTitle}>
        <FormattedMessage
          id="telemetry.telemetryOptedInNoticeDescription"
          defaultMessage="To learn about how usage data helps us manage and improve our products and services, see our {privacyStatementLink}. To stop collection, {disableLink}."
          values={{
            privacyStatementLink: (
              <EuiLink
                onClick={onSeenBanner}
                href={PRIVACY_STATEMENT_URL}
                target="_blank"
                rel="noopener"
              >
                <FormattedMessage
                  id="telemetry.telemetryOptedInPrivacyStatement"
                  defaultMessage="Privacy Statement"
                />
              </EuiLink>
            ),
            disableLink: (
              <EuiLink href={PATH_TO_ADVANCED_SETTINGS} onClick={onSeenBanner}>
                <FormattedMessage
                  id="telemetry.telemetryOptedInDisableUsage"
                  defaultMessage="disable usage data here"
                />
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="s" />
        <EuiButton size="s" onClick={onSeenBanner}>
          <FormattedMessage
            id="telemetry.telemetryOptedInDismissMessage"
            defaultMessage="Dismiss"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }
}
