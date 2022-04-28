/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TelemetryConstants } from '..';

interface Props {
  telemetryConstants: TelemetryConstants;
}

export class OptInMessage extends React.PureComponent<Props> {
  render() {
    return (
      <React.Fragment>
        <FormattedMessage
          id="telemetry.telemetryBannerDescription"
          defaultMessage="Want to help us improve the Elastic Stack? Data usage collection is currently disabled. Enabling data usage collection helps us manage and improve our products and services. See our {privacyStatementLink} for more details."
          values={{
            privacyStatementLink: (
              <EuiLink
                href={this.props.telemetryConstants.getPrivacyStatementUrl()}
                target="_blank"
                rel="noopener"
              >
                <FormattedMessage
                  id="telemetry.welcomeBanner.telemetryConfigDetailsDescription.telemetryPrivacyStatementLinkText"
                  defaultMessage="Privacy Statement"
                />
              </EuiLink>
            ),
          }}
        />
      </React.Fragment>
    );
  }
}
