/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart } from 'kibana/public';
import { OptInMessage } from './opt_in_message';

interface Props {
  onChangeOptInClick: (isOptIn: boolean) => void;
  docLinks: CoreStart['docLinks'];
}

export class OptInBanner extends React.PureComponent<Props> {
  render() {
    const { onChangeOptInClick, docLinks } = this.props;
    const title = (
      <FormattedMessage
        id="telemetry.welcomeBanner.title"
        defaultMessage="Help us improve the Elastic Stack"
      />
    );
    return (
      <EuiCallOut iconType="questionInCircle" title={title}>
        <OptInMessage docLinks={docLinks} />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" data-test-subj="enable" onClick={() => onChangeOptInClick(true)}>
              <FormattedMessage
                id="telemetry.welcomeBanner.enableButtonLabel"
                defaultMessage="Enable"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" data-test-subj="disable" onClick={() => onChangeOptInClick(false)}>
              <FormattedMessage
                id="telemetry.welcomeBanner.disableButtonLabel"
                defaultMessage="Disable"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
    );
  }
}
