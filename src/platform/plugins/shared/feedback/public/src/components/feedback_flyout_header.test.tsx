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
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FeedbackFlyoutHeader } from './feedback_flyout_header';

describe('FeedbackFlyoutHeader', () => {
  const closeFlyout = jest.fn();

  it('renders the flyout header', () => {
    renderWithI18n(<FeedbackFlyoutHeader closeFlyout={jest.fn()} />);

    const header = screen.getByTestId('feedbackFlyoutHeader');

    expect(header).toBeInTheDocument();
  });

  it('close button calls closeFlyout', async () => {
    renderWithI18n(<FeedbackFlyoutHeader closeFlyout={closeFlyout} />);

    const header = screen.getByTestId('feedbackFlyoutHeader');

    expect(header).toBeInTheDocument();

    const closeButton = screen.getByTestId('feedbackFlyoutCloseButton');

    fireEvent.click(closeButton);

    expect(closeFlyout).toHaveBeenCalledTimes(1);
  });
});
