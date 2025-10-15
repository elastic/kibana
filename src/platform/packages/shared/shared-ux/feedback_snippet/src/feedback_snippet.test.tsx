/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { I18nProvider } from '@kbn/i18n-react';
import { FeedbackSnippet } from './feedback_snippet';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';

jest.mock('./confetti');

describe('FeedbackSnippet', () => {
  const props = {
    feedbackButtonMessage: 'Got feedback?',
    feedbackSnippetId: 'feedbackSnippetTestId',
    promptViewMessage: 'Was this page helpful?',
    surveyUrl: 'https://www.elastic.co',
  };

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    Object.defineProperty(window, 'open', {
      value: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderComponent = () =>
    render(
      <I18nProvider>
        <FeedbackSnippet {...props} />
      </I18nProvider>
    );

  /**
   * GIVEN the localStorage key is set
   * WHEN the feedback snippet renders
   * THEN it should take the form of a feedback button
   */
  it('renders the feedback button if local storage key is set', () => {
    localStorage.setItem(props.feedbackSnippetId, Date.now().toString());
    renderComponent();
    expect(screen.getByRole('button', { name: 'Feedback button' })).toBeInTheDocument();
    expect(screen.queryByTestId('feedbackSnippetPanel')).not.toBeInTheDocument();
  });

  /**
   * GIVEN the localStorage key is not set
   * WHEN the feedback snippet renders
   * THEN it should take the form of a feedback panel
   */
  it('renders the feedback panel if local storage key is not set', () => {
    renderComponent();
    expect(screen.getByTestId('feedbackSnippetPanel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Feedback button' })).not.toBeInTheDocument();
  });

  describe('panel flows', () => {
    /**
     * GIVEN the feedback panel is rendered
     * WHEN I click the positive feedback button
     * THEN I should see the positive feedback view
     * AND after a timeout the panel should disappear
     * AND the feedback button should be shown
     */
    it('positive feedback flow: shows positive view, then disappears and shows button', async () => {
      renderComponent();
      await user.click(screen.getByRole('button', { name: 'Thumb up' }));
      expect(await screen.findByTestId('feedbackSnippetPanelPositiveIcon')).toBeInTheDocument();
      await act(() => {
        jest.runAllTimers();
      });
      expect(screen.queryByTestId('feedbackSnippetPanelPositiveIcon')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Feedback button' })).toBeInTheDocument();
      expect(localStorage.getItem(props.feedbackSnippetId)).not.toBeNull();
    });

    /**
     * GIVEN the feedback panel is rendered
     * WHEN I click the negative feedback button and then the survey button
     * THEN the survey should open in a new tab
     * AND the panel should disappear
     * AND the feedback button should be shown
     */
    it('negative feedback flow: shows negative view with survey button, clicking it opens survey and shows feedback button', async () => {
      renderComponent();
      await user.click(screen.getByRole('button', { name: 'Thumb down' }));
      expect(screen.getByRole('button', { name: 'Take quick survey' })).toBeInTheDocument();
      expect(localStorage.getItem(props.feedbackSnippetId)).not.toBeNull();
      await user.click(screen.getByRole('button', { name: 'Take quick survey' }));
      expect(window.open).toHaveBeenCalledWith(props.surveyUrl, '_blank');
      expect(screen.getByRole('button', { name: 'Feedback button' })).toBeInTheDocument();
      expect(screen.queryByTestId('feedbackSnippetPanel')).not.toBeInTheDocument();
    });

    /**
     * GIVEN the feedback panel is rendered
     * WHEN I click the dismiss panel button
     * THEN the panel should disappear
     * AND the feedback button should be shown
     */
    it('dismiss panel flow: clicking dismiss button hides panel and shows feedback button', async () => {
      renderComponent();
      await user.click(screen.getByRole('button', { name: 'Close feedback panel' }));
      expect(screen.queryByTestId('feedbackSnippetPanel')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Feedback button' })).toBeInTheDocument();
      expect(localStorage.getItem(props.feedbackSnippetId)).not.toBeNull();
    });
  });

  describe('button flows', () => {
    /**
     * GIVEN the feedback button is rendered
     * WHEN I click the survey button
     * THEN the survey should open in a new tab
     */
    it('feedback button flow: clicking the button opens the survey', async () => {
      localStorage.setItem(props.feedbackSnippetId, Date.now().toString());
      renderComponent();
      await user.click(screen.getByRole('button', { name: 'Feedback button' }));
      expect(window.open).toHaveBeenCalledWith(props.surveyUrl, '_blank');
    });
  });
});
