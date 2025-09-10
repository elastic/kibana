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
import type { FeedbackView } from '.';

interface FeedbackPanelProps {
  feedbackView: FeedbackView;
  handleDismissPanel: () => void;
  handleOpenSurveyAndDismissPanel: () => void;
  handleNegativeFeedback: () => void;
  handlePositiveFeedback: () => void;
}

const ConfettiComponentLazy = React.lazy(() => import('./confetti'));

const thumbUpIconLabel = i18n.translate(
  'core.ui.chrome.sideNavigation.sideNavigation.feedbackPanel.thumbUpIconLabel',
  {
    defaultMessage: 'Thumb up',
  }
);

const thumbDownIconLabel = i18n.translate(
  'core.ui.chrome.sideNavigation.sideNavigation.feedbackPanel.thumbDownIconLabel',
  {
    defaultMessage: 'Thumb down',
  }
);

const faceHappyIconLabel = i18n.translate(
  'core.ui.chrome.sideNavigation.sideNavigation.feedbackPanel.faceHappyIconLabel',
  {
    defaultMessage: 'Happy face',
  }
);

const panelMessages = {
  prompt: (
    <FormattedMessage
      id="core.ui.chrome.sideNavigation.feedbackPanel.promptTitle"
      defaultMessage="How's the navigation working for you?"
    />
  ),
  positive: (
    <FormattedMessage
      id="core.ui.chrome.sideNavigation.feedbackPanel.positiveTitle"
      defaultMessage="Thanks for the feedback!{br}Glad you enjoy it!"
      values={{ br: <br /> }}
    />
  ),
  negative: (
    <FormattedMessage
      id="core.ui.chrome.sideNavigation.feedbackPanel.negativeTitle"
      defaultMessage="Sorry to hear! Please, tell us a little more:"
    />
  ),
};

/**
 * A panel to gather user feedback.
 * There are 3 available views:
 * - Prompt: Ask the user for feedback
 * - Positive: Thank the user for positive feedback
 * - Negative: Ask the user for more information
 */
export const FeedbackPanel = ({
  feedbackView,
  handleDismissPanel,
  handleOpenSurveyAndDismissPanel,
  handleNegativeFeedback,
  handlePositiveFeedback,
}: FeedbackPanelProps) => {
  const { euiTheme } = useEuiTheme();

  const closePanelIcon = (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="cross"
        color="text"
        onClick={handleDismissPanel}
        id="sideNavigationFeedbackPanelDismiss"
        aria-label={i18n.translate(
          'core.ui.chrome.sideNavigation.sideNavigation.feedbackPanel.closeIconLabel',
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
          id="sideNavigationFeedbackPanelThumbDown"
          color="danger"
          size="s"
        >
          <EuiIcon type="thumbDown" aria-label={thumbDownIconLabel} />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          onClick={handlePositiveFeedback}
          id="sideNavigationFeedbackPanelThumbUp"
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
      <EuiIcon type="faceHappy" color="success" size="l" aria-label={faceHappyIconLabel} />
    </EuiFlexItem>
  );

  const negativeFooter = (
    <EuiButton
      onClick={handleOpenSurveyAndDismissPanel}
      fill
      fullWidth
      iconType="popout"
      iconSide="right"
      id="sideNavigationFeedbackPanelSurveyLink"
      aria-label={i18n.translate(
        'core.ui.chrome.sideNavigation.sideNavigation.feedbackPanelSurveyButtonLabel',
        {
          defaultMessage: 'Take quick survey',
        }
      )}
    >
      <FormattedMessage
        id="core.ui.chrome.sideNavigation.sideNavigation.feedbackPanelSurveyButtonText"
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
      grow={false}
      hasShadow
      css={css`
        margin: ${euiTheme.size.m};
      `}
    >
      <EuiFlexGroup
        gutterSize="s"
        justifyContent={feedbackView === 'positive' ? 'center' : 'flexStart'}
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
      {feedbackView === 'positive' && <ConfettiComponentLazy />}
    </EuiPanel>
  );
};
