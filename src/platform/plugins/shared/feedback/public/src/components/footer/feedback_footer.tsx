/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SessionDataDisclaimer } from './session_data_disclaimer';
import { SendFeedbackButton } from './send_feedback_button';
import { CancelButton } from './cancel_button';

interface Props {
  isSendFeedbackButtonDisabled: boolean;
  hideFeedbackContainer: () => void;
  submitFeedback: () => Promise<void>;
}

export const FeedbackFooter = ({
  isSendFeedbackButtonDisabled,
  hideFeedbackContainer,
  submitFeedback,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const footerCss = css`
    padding-top: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexItem grow={false} css={footerCss} data-test-subj="feedbackFooter">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={true}>
          <SessionDataDisclaimer />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <CancelButton hideFeedbackContainer={hideFeedbackContainer} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SendFeedbackButton
            isSendFeedbackButtonDisabled={isSendFeedbackButtonDisabled}
            submitFeedback={submitFeedback}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
