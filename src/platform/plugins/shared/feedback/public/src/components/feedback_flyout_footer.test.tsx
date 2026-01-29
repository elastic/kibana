/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { FeedbackFlyoutFooter } from './feedback_flyout_footer';
import { renderWithI18n } from '@kbn/test-jest-helpers';

describe('FeedbackFlyoutFooter', () => {
  const submitFeedback = jest.fn();

  it('renders flyout footer', () => {
    renderWithI18n(
      <FeedbackFlyoutFooter isSendFeedbackButtonDisabled={false} submitFeedback={submitFeedback} />
    );
    expect(screen.getByTestId('feedbackFlyoutFooter')).toBeInTheDocument();

    const sendButton = screen.getByTestId('sendFeedbackButton');

    expect(sendButton).toBeEnabled();
  });

  it('renders disabled send button when isSendFeedbackButtonDisabled is true', () => {
    renderWithI18n(
      <FeedbackFlyoutFooter isSendFeedbackButtonDisabled={true} submitFeedback={submitFeedback} />
    );
    expect(screen.getByTestId('feedbackFlyoutFooter')).toBeInTheDocument();

    const sendButton = screen.getByTestId('sendFeedbackButton');

    expect(sendButton).toBeDisabled();
  });

  it('calls submitFeedback when send button is clicked', () => {
    renderWithI18n(
      <FeedbackFlyoutFooter isSendFeedbackButtonDisabled={false} submitFeedback={submitFeedback} />
    );
    expect(screen.getByTestId('feedbackFlyoutFooter')).toBeInTheDocument();

    const sendButton = screen.getByTestId('sendFeedbackButton');

    fireEvent.click(sendButton);

    expect(submitFeedback).toHaveBeenCalledTimes(1);
  });
});
