/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ChangeEvent, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { FeedbackHeader } from './feedback_header';
import { FeedbackBody } from './feedback_body';
import { FeedbackFooter } from './feedback_footer';

interface Props {
  core: CoreStart;
}

export const FeedbackForm = ({ core }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [feedbackText, setFeedbackText] = useState('');

  const isSendFeedbackButtonDisabled = !feedbackText.trim().length;

  const handleChangeFeedbackText = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setFeedbackText(e.target.value);
  };

  const submitFeedback = () => {
    // TODO
  };

  const formCss = css`
    padding: ${euiTheme.size.l};
    width: 648px;
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="feedbackForm" css={formCss}>
      <FeedbackHeader />
      <FeedbackBody
        core={core}
        feedbackText={feedbackText}
        handleChangeFeedbackText={handleChangeFeedbackText}
      />
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiText size="s" color="subdued" data-test-subj="feedbackFormSessionInfo">
          <FormattedMessage
            id="feedback.form.sessionInfo.description"
            defaultMessage="Your session information is included along with your input and email. If you need assistance, <supportLink>submit a support request</supportLink> instead."
            values={{
              supportLink: (linkText) => (
                <EuiLink href="https://support.elastic.co/home" target="_blank">
                  {linkText}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <FeedbackFooter
        isSendFeedbackButtonDisabled={isSendFeedbackButtonDisabled}
        submitFeedback={submitFeedback}
      />
    </EuiFlexGroup>
  );
};
