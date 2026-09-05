/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import { FeedbackSuccessToastBody, FeedbackSuccessToastTitle } from './feedback_success_toast';

const SURVEY_URL = 'https://example.com/research-panel';

describe('FeedbackSuccessToast', () => {
  it('should render the success title', () => {
    renderWithI18n(<FeedbackSuccessToastTitle />);

    expect(screen.getByTestId('feedbackSuccessToastTitle')).toHaveTextContent(
      'Thanks for your feedback!'
    );
  });

  it('should render the research panel copy and participate link', () => {
    renderWithI18n(<FeedbackSuccessToastBody onDismiss={jest.fn()} surveyUrl={SURVEY_URL} />);

    expect(screen.getByTestId('feedbackSuccessToastBody')).toHaveTextContent(
      'Want to help shape the future of Elastic? Sign up to join our research panel!'
    );
    expect(screen.getByTestId('feedbackSuccessToastParticipateButton')).toHaveAttribute(
      'href',
      SURVEY_URL
    );
  });

  it('should call onDismiss when Maybe later is clicked', async () => {
    const onDismiss = jest.fn();
    renderWithI18n(<FeedbackSuccessToastBody onDismiss={onDismiss} surveyUrl={SURVEY_URL} />);

    await userEvent.click(screen.getByTestId('feedbackSuccessToastMaybeLaterButton'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
