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
