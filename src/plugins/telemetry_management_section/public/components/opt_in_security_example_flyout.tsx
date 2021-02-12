/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiPortal, // EuiPortal is a temporary requirement to use EuiFlyout with "ownFocus"
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { loadingSpinner } from './loading_spinner';

interface Props {
  onClose: () => void;
}

const LazyExampleSecurityPayload = React.lazy(() => import('./example_security_payload'));

/**
 * React component for displaying the example data associated with the Telemetry opt-in banner.
 */
export class OptInSecurityExampleFlyout extends React.PureComponent<Props> {
  render() {
    return (
      <EuiPortal>
        <EuiFlyout ownFocus onClose={this.props.onClose} maxWidth={true}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>Endpoint security data</h2>
            </EuiTitle>
            <EuiTextColor color="subdued">
              <EuiText>
                This is a representative sample of the endpoint security alert event that we
                collect. Endpoint security data is collected only when the Elastic Endpoint is
                enabled. It includes information about the endpoint configuration and detection
                events.
              </EuiText>
            </EuiTextColor>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <React.Suspense fallback={loadingSpinner}>
              <LazyExampleSecurityPayload />
            </React.Suspense>
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
