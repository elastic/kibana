/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
