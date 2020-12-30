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

import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { MountPoint } from 'kibana/public';
import React, { useState } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

export const defaultAlertTitle = i18n.translate('security.checkup.insecureClusterTitle', {
  defaultMessage: 'Your data is not secure',
});

export const defaultAlertText: (onDismiss: (persist: boolean) => void) => MountPoint = (
  onDismiss
) => (e) => {
  const AlertText = () => {
    const [persist, setPersist] = useState(false);

    return (
      <I18nProvider>
        <div data-test-subj="insecureClusterDefaultAlertText">
          <EuiText size="s">
            <FormattedMessage
              id="security.checkup.insecureClusterMessage"
              defaultMessage="Don't lose one bit. Secure your data for free with Elastic."
            />
          </EuiText>
          <EuiSpacer />
          <EuiCheckbox
            id="persistDismissedAlertPreference"
            checked={persist}
            onChange={(changeEvent) => setPersist(changeEvent.target.checked)}
            label={i18n.translate('security.checkup.dontShowAgain', {
              defaultMessage: `Don't show again`,
            })}
          />
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="primary"
                fill
                href="https://www.elastic.co/what-is/elastic-stack-security?blade=kibanasecuritymessage"
                target="_blank"
              >
                {i18n.translate('security.checkup.learnMoreButtonText', {
                  defaultMessage: `Learn more`,
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={() => onDismiss(persist)}
                data-test-subj="defaultDismissAlertButton"
              >
                {i18n.translate('security.checkup.dismissButtonText', {
                  defaultMessage: `Dismiss`,
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </I18nProvider>
    );
  };

  render(<AlertText />, e);

  return () => unmountComponentAtNode(e);
};
