/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';

import { FeedbackButton } from './feedback_button';
import { FeedbackPanel } from './feedback_panel';

const FEEDBACK_PANEL_POSITIVE_LIFETIME = 3000;

interface FeedbackSnippetProps {
  /**
   * Message to display in the FeedbackButton.
   */
  feedbackButtonMessage: React.ReactNode;
  /**
   * HTML id for click tracking purposes.
   */
  feedbackSnippetId: string;
  /**
   * Key for local storage.
   */
  feedbackPanelLocalStorageKey: string;
  /**
   * Message to display during the feedback prompt view.
   */
  promptViewMessage: React.ReactNode;
  /**
   * Survey URL where the FeedbackButton will redirect to.
   */
  surveyUrl: string;
}

export type FeedbackView = 'prompt' | 'positive' | 'negative';

/**
 * A snippet to gather user feedback.
 * Initially a panel, once interacted with, it becomes a persistent button.
 */
export const FeedbackSnippet = ({
  feedbackButtonMessage,
  feedbackSnippetId,
  feedbackPanelLocalStorageKey,
  promptViewMessage,
  surveyUrl,
}: FeedbackSnippetProps) => {
  const [feedbackView, setFeedbackView] = useState<FeedbackView>('prompt');
  const [showPanel, setShowPanel] = useState(() => {
    return localStorage.getItem(feedbackPanelLocalStorageKey) === null;
  });

  const handleOpenSurvey = () => {
    window.open(surveyUrl, '_blank');
  };

  const storeFeedbackInteraction = useCallback(() => {
    localStorage.setItem(feedbackPanelLocalStorageKey, Date.now().toString());
  }, [feedbackPanelLocalStorageKey]);

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
      feedbackSnippetId={feedbackSnippetId}
      feedbackView={feedbackView}
      handleDismissPanel={handleDismissPanel}
      handleOpenSurveyAndDismissPanel={handleOpenSurveyAndDismissPanel}
      handlePositiveFeedback={handlePositiveFeedback}
      handleNegativeFeedback={handleNegativeFeedback}
      promptViewMessage={promptViewMessage}
    />
  ) : (
    <FeedbackButton
      feedbackButtonMessage={feedbackButtonMessage}
      feedbackSnippetId={feedbackSnippetId}
      handleOpenSurvey={handleOpenSurvey}
    />
  );
};
