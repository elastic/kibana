/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, act, fireEvent } from '@testing-library/react';
import { FeedbackBody } from './feedback_body';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';

const coreStartMock = coreMock.createStart();

const propsMock = {
  handleChangeFeedbackText: jest.fn(),
  feedbackText: '',
  core: coreStartMock,
};

describe('FeedbackBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render flyout body', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} />);
    });

    const body = screen.getByTestId('feedbackFormBody');

    expect(body).toBeInTheDocument();
  });

  it('should render feedback text inside textarea', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} feedbackText="Test feedback" />);
    });

    const body = screen.getByTestId('feedbackFormBody');

    expect(body).toBeInTheDocument();

    const feedbackTextarea = screen.getByTestId('feedbackFormTextArea');

    expect(feedbackTextarea).toBeInTheDocument();
    expect(feedbackTextarea).toHaveValue('Test feedback');
  });

  it('should call handleChangeFeedbackText when feedback text is changed', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} />);
    });

    const feedbackTextarea = screen.getByTestId('feedbackFormTextArea');

    expect(feedbackTextarea).toBeInTheDocument();

    fireEvent.change(feedbackTextarea, {
      target: { value: 'Test feedback' },
    });

    expect(propsMock.handleChangeFeedbackText).toHaveBeenCalledTimes(1);
  });
});
