/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';

import type { SolutionId } from '@kbn/core-chrome-browser';
import { FeedbackButton } from './feedback_button';
import { FeedbackPanel } from './feedback_panel';
import { FEEDBACK_PANEL_LS_KEY, FEEDBACK_PANEL_POSITIVE_LIFETIME } from '../../constants';

const feedbackUrls: { [id in SolutionId]: string } = {
  es: 'https://ela.st/search-nav-feedback',
  chat: 'https://ela.st/search-nav-feedback',
  oblt: 'https://ela.st/o11y-nav-feedback',
  security: 'https://ela.st/security-nav-feedback',
};

interface FeedbackSnippetProps {
  solutionId: SolutionId;
}

export type FeedbackView = 'prompt' | 'positive' | 'negative';

/**
 * A snippet to gather user feedback.
 * Initially a panel, once interacted with, it becomes a persistent button.
 */
export const FeedbackSnippet = ({ solutionId }: FeedbackSnippetProps) => {
  const [feedbackView, setFeedbackView] = useState<FeedbackView>('prompt');
  const [showPanel, setShowPanel] = useState(() => {
    return localStorage.getItem(FEEDBACK_PANEL_LS_KEY) === null;
  });
  const surveyUrl = feedbackUrls[solutionId];

  const handleOpenSurvey = () => {
    window.open(surveyUrl, '_blank');
  };

  const storeFeedbackInteraction = useCallback(() => {
    localStorage.setItem(FEEDBACK_PANEL_LS_KEY, Date.now().toString());
  }, []);

  const handleDismissPanel = useCallback(() => {
    setShowPanel(false);
    storeFeedbackInteraction();
  }, [storeFeedbackInteraction]);

  const handleOpenSurveyAndDismissPanel = () => {
    handleOpenSurvey();
    handleDismissPanel();
  };

  const handlePositiveFeedback = () => {
    setFeedbackView('positive');
  };

  const handleNegativeFeedback = () => {
    setFeedbackView('negative');
    // User might choose not to provide feedback and might not click on the x button
    // In this case, we should not immediately hide the panel but only store the interaction
    storeFeedbackInteraction();
  };

  useEffect(() => {
    let timer: number | undefined;
    if (feedbackView === 'positive') {
      timer = window.setTimeout(() => {
        handleDismissPanel();
      }, FEEDBACK_PANEL_POSITIVE_LIFETIME);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [feedbackView, handleDismissPanel]);

  return showPanel ? (
    <FeedbackPanel
      feedbackView={feedbackView}
      handleDismissPanel={handleDismissPanel}
      handleOpenSurveyAndDismissPanel={handleOpenSurveyAndDismissPanel}
      handlePositiveFeedback={handlePositiveFeedback}
      handleNegativeFeedback={handleNegativeFeedback}
    />
  ) : (
    <FeedbackButton handleOpenSurvey={handleOpenSurvey} />
  );
};
