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
import { FeedbackButton } from './feedback_button';
import { renderWithI18n } from '@kbn/test-jest-helpers';

const propsMock = {
  handleShowFeedbackForm: jest.fn(),
};

describe('FeedbackButton', () => {
  it('should render feedback button', () => {
    renderWithI18n(<FeedbackButton {...propsMock} />);

    const feedbackButton = screen.getByTestId('feedbackButton');
    expect(feedbackButton).toBeInTheDocument();
  });
});
