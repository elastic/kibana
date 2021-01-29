/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint @elastic/eui/href-or-on-click:0 */

import * as React from 'react';
import { EuiButton, EuiLink, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { PATH_TO_ADVANCED_SETTINGS, PRIVACY_STATEMENT_URL } from '../../common/constants';
import { HttpSetup } from '../../../../core/public';

interface Props {
  http: HttpSetup;
  onSeenBanner: () => any;
}

export class OptedInNoticeBanner extends React.PureComponent<Props> {
  render() {
    const { onSeenBanner, http } = this.props;
    const basePath = http.basePath.get();

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
              <EuiLink href={`${basePath}${PATH_TO_ADVANCED_SETTINGS}`} onClick={onSeenBanner}>
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
