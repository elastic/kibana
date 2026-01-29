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
import { FeedbackBody } from './feedback_body';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FEEDBACK_TYPE } from '../constants';

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

  it('should render email address inside email input', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} userEmail="test@elastic.co" />);
    });

    const body = screen.getByTestId('feedbackFormBody');

    expect(body).toBeInTheDocument();

    const emailInput = screen.getByTestId('feedbackFormEmailInput');

    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue('test@elastic.co');
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

  it('should render select with feedback type options', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} feedbackType={FEEDBACK_TYPE.ISSUE_REPORT} />);
    });

    const body = screen.getByTestId('feedbackFormBody');

    expect(body).toBeInTheDocument();

    const feedbackTypeSelect = screen.getByTestId('feedbackFormTypeSelect');

    expect(feedbackTypeSelect).toBeInTheDocument();
    expect(feedbackTypeSelect).toHaveValue(FEEDBACK_TYPE.ISSUE_REPORT);
  });

  it('should call handleChangeFeedbackType when feedback type is changed', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} />);
    });

    const feedbackTypeSelect = screen.getByTestId('feedbackFormTypeSelect');

    expect(feedbackTypeSelect).toBeInTheDocument();

    fireEvent.change(feedbackTypeSelect, { target: { value: FEEDBACK_TYPE.ISSUE_REPORT } });

    expect(propsMock.handleChangeFeedbackType).toHaveBeenCalledTimes(1);
  });

  it('should call handleChangeEmail when email input is changed', async () => {
    await act(async () => {
      renderWithI18n(<FeedbackBody {...propsMock} />);
    });

    const emailInput = screen.getByTestId('feedbackFormEmailInput');

    expect(emailInput).toBeInTheDocument();

    fireEvent.change(emailInput, {
      target: { value: 'test' },
    });

    expect(propsMock.handleChangeEmail).toHaveBeenCalledTimes(1);
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
