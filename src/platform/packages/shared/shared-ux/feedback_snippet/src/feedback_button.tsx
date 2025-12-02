/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';

import type { CommonProps } from '@elastic/eui';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface FeedbackButtonProps extends CommonProps {
  feedbackButtonMessage: React.ReactNode;
  feedbackSnippetId: string;
  handleOpenSurvey: () => void;
}

const feedbackButtonAriaLabel = i18n.translate(
  'sharedUXPackages.feedbackSnippet.feedbackButtonLabel',
  {
    defaultMessage: 'Feedback button',
  }
);

/**
 * A button to gather user feedback.
 * It opens up a survey on a new tab.
 *
 */
export const FeedbackButton = ({
  feedbackButtonMessage,
  feedbackSnippetId,
  handleOpenSurvey,
  className,
}: FeedbackButtonProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      className={className}
      css={css`
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiButtonEmpty
        data-test-subj={`${feedbackSnippetId}ButtonSurveyLink`}
        onClick={handleOpenSurvey}
        css={css`
          width: 100%;
        `}
        color="text"
        iconType="popout"
        iconSide="right"
        size="s"
        id={`${feedbackSnippetId}ButtonSurveyLink`}
        aria-label={feedbackButtonAriaLabel}
      >
        {feedbackButtonMessage}
      </EuiButtonEmpty>
    </div>
  );
};
