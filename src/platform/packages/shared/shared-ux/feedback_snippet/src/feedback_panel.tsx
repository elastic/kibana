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
        data-test-subj={`${feedbackSnippetId}PanelDismiss`}
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
      <EuiFlexItem grow={true}>
        <EuiButton
          data-test-subj={`${feedbackSnippetId}PanelThumbDown`}
          onClick={handleNegativeFeedback}
          id={`${feedbackSnippetId}PanelThumbDown`}
          color="text"
          size="s"
          fullWidth={true}
        >
          <EuiIcon type="thumbDown" aria-label={thumbDownIconLabel} color="danger" />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiButton
          data-test-subj={`${feedbackSnippetId}PanelThumbUp`}
          onClick={handlePositiveFeedback}
          id={`${feedbackSnippetId}PanelThumbUp`}
          color="text"
          size="s"
          fullWidth={true}
        >
          <EuiIcon type="thumbUp" aria-label={thumbUpIconLabel} color="success" />
        </EuiButton>
      </EuiFlexItem>
    </>
  );

  const positiveFooter = (
    <EuiFlexItem grow={false}>
      <EuiIcon
        data-test-subj="feedbackSnippetPanelPositiveIcon"
        type="thumbUp"
        color="success"
        size="l"
        aria-label={thumbUpIconLabel}
      />
    </EuiFlexItem>
  );

  const negativeFooter = (
    <EuiButton
      data-test-subj={`${feedbackSnippetId}PanelSurveyLink`}
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
      hasShadow={false}
      paddingSize="none"
      css={css`
        margin: ${euiTheme.size.base} ${euiTheme.size.m};
      `}
      color="transparent"
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
      <EuiFlexGroup
        gutterSize="none"
        justifyContent="center"
        css={css`
          gap: ${euiTheme.size.s};
        `}
      >
        {panelFooter[feedbackView]}
      </EuiFlexGroup>
      {feedbackView === 'positive' && <Confetti />}
    </EuiPanel>
  );
};
