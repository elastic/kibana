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

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FeedbackView } from './feedback_snippet';
import { Confetti } from './confetti';

interface FeedbackPanelProps {
  feedbackSnippetId: string;
  feedbackView: FeedbackView;
  promptViewMessage: React.ReactNode;
  handleDismissPanel: () => void;
  handleOpenSurveyAndDismissPanel: () => void;
  handleNegativeFeedback: () => void;
  handlePositiveFeedback: () => void;
}

const thumbUpIconLabel = i18n.translate(
  'sharedUXPackages.feedbackSnippet.feedbackPanel.thumbUpIconLabel',
  {
    defaultMessage: 'Thumb up',
  }
);

const thumbDownIconLabel = i18n.translate(
  'sharedUXPackages.feedbackSnippet.feedbackPanel.thumbDownIconLabel',
  {
    defaultMessage: 'Thumb down',
  }
);

const faceHappyIconLabel = i18n.translate(
  'sharedUXPackages.feedbackSnippet.feedbackPanel.faceHappyIconLabel',
  {
    defaultMessage: 'Happy face',
  }
);

/**
 * A panel to gather user feedback.
 * There are 3 available views:
 * - Prompt: Ask the user for feedback
 * - Positive: Thank the user for positive feedback
 * - Negative: Ask the user for more information
 */
export const FeedbackPanel = ({
  feedbackSnippetId,
  feedbackView,
  promptViewMessage,
  handleDismissPanel,
  handleOpenSurveyAndDismissPanel,
  handleNegativeFeedback,
  handlePositiveFeedback,
}: FeedbackPanelProps) => {
  const { euiTheme } = useEuiTheme();

  const panelMessages = {
    prompt: promptViewMessage,
    positive: (
      <FormattedMessage
        id="sharedUXPackages.feedbackSnippet.feedbackPanel.positiveTitle"
        defaultMessage="Thanks for the feedback!{br}Glad you enjoy it!"
        values={{ br: <br /> }}
      />
    ),
    negative: (
      <FormattedMessage
        id="sharedUXPackages.feedbackSnippet.feedbackPanel.negativeTitle"
        defaultMessage="Sorry to hear! Please, tell us a little more:"
      />
    ),
  };

  const closePanelIcon = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        data-test-subj="feedbackSnippetPanelDismiss"
        iconType="cross"
        color="text"
        onClick={handleDismissPanel}
        id={`${feedbackSnippetId}PanelDismiss`}
        aria-label={i18n.translate(
          'sharedUXPackages.feedbackSnippet.feedbackPanel.closeIconLabel',
          {
            defaultMessage: 'Close feedback panel',
          }
        )}
      />
    </EuiFlexItem>
  );

  const promptFooter = (
    <>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={handleNegativeFeedback}
          id={`${feedbackSnippetId}PanelThumbDown`}
          color="danger"
          size="s"
        >
          <EuiIcon type="thumbDown" aria-label={thumbDownIconLabel} />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={handlePositiveFeedback}
          id={`${feedbackSnippetId}PanelThumbUp`}
          color="success"
          size="s"
        >
          <EuiIcon type="thumbUp" aria-label={thumbUpIconLabel} />
        </EuiButton>
      </EuiFlexItem>
    </>
  );

  const positiveFooter = (
    <EuiFlexItem grow={false}>
      <EuiIcon
        data-test-subj="feedbackSnippetPanelPositiveIcon"
        type="faceHappy"
        color="success"
        size="l"
        aria-label={faceHappyIconLabel}
      />
    </EuiFlexItem>
  );

  const negativeFooter = (
    <EuiButton
      onClick={handleOpenSurveyAndDismissPanel}
      fill
      fullWidth
      size="s"
      iconType="popout"
      iconSide="right"
      id={`${feedbackSnippetId}PanelSurveyLink`}
      aria-label={i18n.translate(
        'sharedUXPackages.feedbackSnippet.feedbackPanelSurveyButtonLabel',
        {
          defaultMessage: 'Take quick survey',
        }
      )}
    >
      <FormattedMessage
        id="sharedUXPackages.feedbackSnippet.feedbackPanelSurveyButtonText"
        defaultMessage="Take quick survey"
      />
    </EuiButton>
  );

  const panelFooter = {
    prompt: promptFooter,
    positive: positiveFooter,
    negative: negativeFooter,
  };

  return (
    <EuiPanel
      data-test-subj="feedbackSnippetPanel"
      grow={false}
      hasShadow
      css={css`
        margin: ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup
        gutterSize="s"
        justifyContent={feedbackView === 'positive' ? 'center' : 'spaceBetween'}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s" textAlign={feedbackView === 'positive' ? 'center' : 'left'}>
            {panelMessages[feedbackView]}
          </EuiText>
        </EuiFlexItem>
        {/* Positive feedback view closes automatically */}
        {feedbackView !== 'positive' && closePanelIcon}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" justifyContent="center">
        {panelFooter[feedbackView]}
      </EuiFlexGroup>
      {feedbackView === 'positive' && <Confetti />}
    </EuiPanel>
  );
};
