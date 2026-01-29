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
import { FeedbackButton } from './feedback_button';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

const coreStartMock = coreMock.createStart();
const license = licensingMock.createLicense({
  license: {
    type: 'platinum',
  },
});

const getLicense = jest.fn().mockResolvedValue(license);

const propsMock = {
  isServerless: false,
  core: coreStartMock,
  getLicense,
};

describe('FeedbackButton', () => {
  it('renders feedback button', () => {
    renderWithI18n(<FeedbackButton {...propsMock} />);

    const feedbackButton = screen.getByTestId('feedbackButton');
    expect(feedbackButton).toBeInTheDocument();
  });

  it('calls openFeedbackFlyout when feedback button is clicked in non-serverless mode', () => {
    renderWithI18n(<FeedbackButton {...propsMock} />);

    const feedbackButton = screen.getByTestId('feedbackButton');

    expect(feedbackButton).toBeInTheDocument();

    fireEvent.click(feedbackButton);

    expect(coreStartMock.overlays.openFlyout).toHaveBeenCalledTimes(1);
  });
});
