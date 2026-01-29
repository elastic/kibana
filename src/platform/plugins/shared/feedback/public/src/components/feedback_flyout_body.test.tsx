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
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { FeedbackFlyoutBody } from './feedback_flyout_body';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FEEDBACK_TYPE } from './constants';

const license = licensingMock.createLicense({
  license: {
    type: 'platinum',
  },
});

const getLicense = jest.fn().mockResolvedValue(license);

const propsMock = {
  handleChangeFeedbackType: jest.fn(),
  handleChangeEmail: jest.fn(),
  handleChangeFeedbackText: jest.fn(),
  getLicense,
  feedbackType: FEEDBACK_TYPE.FEATURE_REQUEST,
  feedbackText: '',
  userEmail: '',
};

describe('FeedbackFlyoutBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders flyout body', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackFlyoutBody {...propsMock} />);
    });

    const body = screen.getByTestId('feedbackFlyoutBody');

    expect(body).toBeInTheDocument();
  });

  it('renders email address inside email input', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackFlyoutBody {...propsMock} userEmail="test@elastic.co" />);
    });

    const body = screen.getByTestId('feedbackFlyoutBody');

    expect(body).toBeInTheDocument();

    const emailInput = screen.getByTestId('feedbackEmailInput');

    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue('test@elastic.co');
  });

  it('renders feedback text inside textarea', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackFlyoutBody {...propsMock} feedbackText="Test feedback" />);
    });

    const body = screen.getByTestId('feedbackFlyoutBody');

    expect(body).toBeInTheDocument();

    const feedbackTextarea = screen.getByTestId('feedbackTextArea');

    expect(feedbackTextarea).toBeInTheDocument();
    expect(feedbackTextarea).toHaveValue('Test feedback');
  });

  it('renders select with feedback type options', async () => {
    await act(async () => {
      renderWithI18n(
        <FeedbackFlyoutBody {...propsMock} feedbackType={FEEDBACK_TYPE.ISSUE_REPORT} />
      );
    });

    const body = screen.getByTestId('feedbackFlyoutBody');

    expect(body).toBeInTheDocument();

    const feedbackTypeSelect = screen.getByTestId('feedbackTypeSelect');

    expect(feedbackTypeSelect).toBeInTheDocument();
    expect(feedbackTypeSelect).toHaveValue(FEEDBACK_TYPE.ISSUE_REPORT);
  });

  it('calls handleChangeFeedbackType when feedback type is changed', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackFlyoutBody {...propsMock} />);
    });

    const feedbackTypeSelect = screen.getByTestId('feedbackTypeSelect');

    expect(feedbackTypeSelect).toBeInTheDocument();

    fireEvent.change(feedbackTypeSelect, { target: { value: FEEDBACK_TYPE.ISSUE_REPORT } });

    expect(propsMock.handleChangeFeedbackType).toHaveBeenCalledTimes(1);
  });

  it('calls handleChangeEmail when email input is changed', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackFlyoutBody {...propsMock} />);
    });

    const emailInput = screen.getByTestId('feedbackEmailInput');

    expect(emailInput).toBeInTheDocument();

    fireEvent.change(emailInput, {
      target: { value: 'test' },
    });

    expect(propsMock.handleChangeEmail).toHaveBeenCalledTimes(1);
  });

  it('calls handleChangeFeedbackText when feedback text is changed', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackFlyoutBody {...propsMock} />);
    });

    const feedbackTextarea = screen.getByTestId('feedbackTextArea');

    expect(feedbackTextarea).toBeInTheDocument();

    fireEvent.change(feedbackTextarea, {
      target: { value: 'Test feedback' },
    });

    expect(propsMock.handleChangeFeedbackText).toHaveBeenCalledTimes(1);
  });
});
