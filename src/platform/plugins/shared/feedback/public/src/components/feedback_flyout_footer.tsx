/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

interface Props {
  isSendFeedbackButtonDisabled: boolean;
  submitFeedback: () => void;
}

export const FeedbackFlyoutFooter = ({ isSendFeedbackButtonDisabled, submitFeedback }: Props) => {
  const { euiTheme } = useEuiTheme();

  const footerCss = css`
    padding-top: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexItem grow={false} css={footerCss} data-test-subj="feedbackFlyoutFooter">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.intercepts.feedbackFlyout.form.infoText"
                  defaultMessage="Session data included"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="info"
                color="subdued"
                content={
                  <FormattedMessage
                    id="xpack.intercepts.feedbackFlyout.form.infoTooltip"
                    defaultMessage="By sending feedback, you acknowledge that session information is collected along with your input to help us better understand your experience. Please do not include any sensitive, personal, or confidential information in this form."
                  />
                }
                iconProps={{
                  className: 'eui-alignTop',
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            data-test-subj="sendFeedbackButton"
            disabled={isSendFeedbackButtonDisabled}
            onClick={submitFeedback}
          >
            <FormattedMessage
              id="xpack.intercepts.feedbackFlyout.form.sendButton.text"
              defaultMessage="Send"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
