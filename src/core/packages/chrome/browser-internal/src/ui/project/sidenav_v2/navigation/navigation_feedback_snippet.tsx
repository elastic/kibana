/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FeedbackSnippet } from '@kbn/shared-ux-feedback-snippet';
import type { SolutionId } from '@kbn/core-chrome-browser';
import { FormattedMessage } from '@kbn/i18n-react';

interface NavigationFeedbackSnippetProps {
  solutionId: SolutionId;
}

const feedbackPanelLocalStorageKey = 'core.ui.chrome.sideNavigation.feedbackInteraction';
const feedbackSnippetId = 'sideNavigationFeedback';

const feedbackUrls: { [id in SolutionId]: string } = {
  es: 'https://ela.st/search-nav-feedback',
  chat: 'https://ela.st/search-nav-feedback',
  oblt: 'https://ela.st/o11y-nav-feedback',
  security: 'https://ela.st/security-nav-feedback',
};

const feedbackButtonMessage = (
  <FormattedMessage
    id="core.ui.chrome.sideNavigation.sideNavigation.feedbackButtonText"
    defaultMessage="Navigation feedback"
  />
);

const promptViewMessage = (
  <FormattedMessage
    id="core.ui.chrome.sideNavigation.feedbackPanel.promptTitle"
    defaultMessage="How's the navigation working for you?"
  />
);

export const NavigationFeedbackSnippet = ({ solutionId }: NavigationFeedbackSnippetProps) => {
  const feedbackSurveyUrl = feedbackUrls[solutionId];

  return (
    <FeedbackSnippet
      feedbackButtonMessage={feedbackButtonMessage}
      feedbackSnippetId={feedbackSnippetId}
      feedbackPanelLocalStorageKey={feedbackPanelLocalStorageKey}
      promptViewMessage={promptViewMessage}
      surveyUrl={feedbackSurveyUrl}
    />
  );
};
