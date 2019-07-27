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

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiCard,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiButton,
  EuiButtonEmpty,
  EuiPortal,
} from '@elastic/eui';

import { OptInMessage } from '../../../../../../../../x-pack/legacy/plugins/telemetry/public/components'
export interface Props {
  urlBasePath: string;
  onConfirm: () => {};
  onDecline: () => {};
}

export function renderTelemetryOptInCard({ urlBasePath, onConfirm, onDecline }: Props) {
  const fetchTelemetry = () => {};

  return (
    <EuiCard
      image={`${urlBasePath}/plugins/kibana/assets/illo_dashboard.png`}
      textAlign="left"
      title={<FormattedMessage id="kbn.home.telemteryOptInTitle" defaultMessage="Help us improve the Elastic Stack"/>}
      description={ <OptInMessage fetchTelemetry={fetchTelemetry} /> }
      footer={
        <footer>
          <EuiButton
            onClick={onConfirm}
            className="homWelcome__footerAction"
            data-test-subj="WelcomeScreenOptInConfirm"
            fill
          >
            <FormattedMessage id="kbn.home.telemteryOptInConfirmButtonLabel" defaultMessage="Yes"/>
          </EuiButton>
          <EuiButtonEmpty
            className="homWelcome__footerAction"
            onClick={onDecline}
            data-test-subj="WelcomeScreenOptInCancel"
          >
            <FormattedMessage id="kbn.home.telemteryOptInDeclineButtonLabel" defaultMessage="No"/>
          </EuiButtonEmpty>
        </footer>
      }
    />
  )
}
