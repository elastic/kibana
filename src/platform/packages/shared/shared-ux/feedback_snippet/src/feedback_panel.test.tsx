/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { FeedbackPanel } from './feedback_panel';
import type { FeedbackView } from './feedback_snippet';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';

jest.mock('./confetti');

describe('FeedbackPanel', () => {
  const handleDismissPanel = jest.fn();
  const handleOpenSurveyAndDismissPanel = jest.fn();
  const handleNegativeFeedback = jest.fn();
  const handlePositiveFeedback = jest.fn();
  const testCases: Array<{ view: FeedbackView; expectedElements: Array<() => HTMLElement> }> = [
    {
      view: 'prompt',
      expectedElements: [
        () => screen.getByRole('button', { name: 'Thumb down' }),
        () => screen.getByRole('button', { name: 'Thumb up' }),
        () => screen.getByRole('button', { name: 'Close feedback panel' }),
      ],
    },
    {
      view: 'positive',
      expectedElements: [() => screen.getByTestId('feedbackSnippetPanelPositiveIcon')],
    },
    {
      view: 'negative',
      expectedElements: [() => screen.getByRole('button', { name: 'Take quick survey' })],
    },
  ];
  const renderPanel = (view: FeedbackView) => {
    return render(
      <I18nProvider>
        <FeedbackPanel
          feedbackSnippetId="feedbackSnippetTestId"
          feedbackView={view}
          promptViewMessage="Was this page helpful?"
          handleDismissPanel={handleDismissPanel}
          handleOpenSurveyAndDismissPanel={handleOpenSurveyAndDismissPanel}
          handleNegativeFeedback={handleNegativeFeedback}
          handlePositiveFeedback={handlePositiveFeedback}
        />
      </I18nProvider>
    );
  };

  it.each(testCases)(
    'renders with the expected inner components based on the feedback view: $view',
    async ({ view, expectedElements }) => {
      renderPanel(view);
      const panel = await screen.findByTestId('feedbackSnippetPanel');
      for (const findElement of expectedElements) {
        const element = findElement();
        expect(element).toBeInTheDocument();
        expect(panel.contains(element)).toBe(true);
      }
      expect(panel).toMatchSnapshot();
    }
  );

  it('calls handlePositiveFeedback when thumb up is clicked', async () => {
    renderPanel('prompt');
    const button = screen.getByRole('button', { name: 'Thumb up' });
    await userEvent.click(button);
    expect(handlePositiveFeedback).toHaveBeenCalledTimes(1);
  });

  it('calls handleNegativeFeedback when thumb down is clicked', async () => {
    renderPanel('prompt');
    const button = screen.getByRole('button', { name: 'Thumb down' });
    await userEvent.click(button);
    expect(handleNegativeFeedback).toHaveBeenCalledTimes(1);
  });

  it('calls handleDismissPanel when close is clicked', async () => {
    renderPanel('prompt');
    const button = screen.getByRole('button', { name: 'Close feedback panel' });
    await userEvent.click(button);
    expect(handleDismissPanel).toHaveBeenCalledTimes(1);
  });

  it('calls handleOpenSurveyAndDismissPanel when survey button is clicked', async () => {
    renderPanel('negative');
    const button = screen.getByRole('button', { name: 'Take quick survey' });
    await userEvent.click(button);
    expect(handleOpenSurveyAndDismissPanel).toHaveBeenCalledTimes(1);
  });
});
