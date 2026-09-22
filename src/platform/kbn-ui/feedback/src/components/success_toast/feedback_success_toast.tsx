/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const FEEDBACK_SUCCESS_TOAST_LIFE_TIME_MS = 60_000;

export const FeedbackSuccessToastTitle = () => (
  <span data-test-subj="feedbackSuccessToastTitle">
    <FormattedMessage
      id="kbnUI.feedback.submissionSuccessToast.title"
      defaultMessage="Thanks for your feedback!"
    />
  </span>
);

export interface FeedbackSuccessToastBodyProps {
  onDismiss: () => void;
  surveyUrl: string;
}

export const FeedbackSuccessToastBody = ({
  onDismiss,
  surveyUrl,
}: FeedbackSuccessToastBodyProps) => (
  <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="feedbackSuccessToastBody">
    <EuiFlexItem>
      <EuiText>
        <FormattedMessage
          id="kbnUI.feedback.submissionSuccessToast.bodyDescription"
          defaultMessage="Want to help shape the future of Elastic? Sign up to join our research panel!"
        />
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            iconType="external"
            iconSide="right"
            href={surveyUrl}
            target="_blank"
            data-test-subj="feedbackSuccessToastParticipateButton"
          >
            <FormattedMessage
              id="kbnUI.feedback.submissionSuccessToast.participateButtonLabel"
              defaultMessage="Participate"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="success"
            onClick={onDismiss}
            data-test-subj="feedbackSuccessToastMaybeLaterButton"
          >
            <FormattedMessage
              id="kbnUI.feedback.submissionSuccessToast.maybeLaterButtonLabel"
              defaultMessage="Maybe later"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
