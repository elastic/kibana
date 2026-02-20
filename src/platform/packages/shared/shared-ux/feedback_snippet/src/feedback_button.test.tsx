/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { FeedbackButton } from './feedback_button';

describe('FeedbackButton', () => {
  const handleOpenSurveyMock = jest.fn();
  beforeEach(() => {
    render(
      <FeedbackButton
        feedbackButtonMessage={'Got feedback?'}
        feedbackSnippetId={'feedbackSnippetTestId'}
        handleOpenSurvey={handleOpenSurveyMock}
      />
    );
  });

  it('renders with the expected id', () => {
    const button = screen.getByRole('button', { name: 'Feedback button' });
    expect(button).toHaveAttribute('id', 'feedbackSnippetTestIdButtonSurveyLink');
    expect(button).toMatchSnapshot();
  });

  it('calls open survey handler when clicked', async () => {
    const button = screen.getByRole('button', { name: 'Feedback button' });
    await userEvent.click(button);
    expect(handleOpenSurveyMock).toHaveBeenCalledTimes(1);
  });
});
