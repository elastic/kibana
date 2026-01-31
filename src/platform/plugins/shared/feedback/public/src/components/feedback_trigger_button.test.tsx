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
import { FeedbackTriggerButton } from './feedback_trigger_button';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';

const coreStartMock = coreMock.createStart();

const propsMock = {
  core: coreStartMock,
};

describe('FeedbackButton', () => {
  it('should render feedback trigger button', () => {
    renderWithI18n(<FeedbackTriggerButton {...propsMock} />);

    const feedbackButton = screen.getByTestId('feedbackTriggerButton');
    expect(feedbackButton).toBeInTheDocument();
  });
});
