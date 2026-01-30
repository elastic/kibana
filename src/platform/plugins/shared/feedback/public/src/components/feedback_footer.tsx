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
  EuiButtonEmpty,
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
  hideFeedbackForm: () => void;
  submitFeedback: () => void;
}

export const FeedbackFooter = ({
  isSendFeedbackButtonDisabled,
  hideFeedbackForm,
  submitFeedback,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const handleCancel = () => {
    hideFeedbackForm();
  };

  const footerCss = css`
    padding-top: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexItem grow={false} css={footerCss} data-test-subj="feedbackFooter">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="feedback.footer.sessionDataIncludedText"
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
                    id="feedback.footer.infoTooltip"
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
          <EuiButtonEmpty data-test-subj="feedbackCancelFeedbackButton" onClick={handleCancel}>
            <FormattedMessage id="feedback.footer.cancelButton" defaultMessage="Cancel" />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="primary"
            data-test-subj="feedbackSendFeedbackButton"
            disabled={isSendFeedbackButtonDisabled}
            onClick={submitFeedback}
          >
            <FormattedMessage id="feedback.footer.sendButton" defaultMessage="Send" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
