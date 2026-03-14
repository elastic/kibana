/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpaceCallout } from './space_callout';

describe('SpaceCallout', () => {
  const onDismissCallout = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the callout text', () => {
    renderWithI18n(<SpaceCallout onDismissCallout={onDismissCallout} />);
    expect(
      screen.getByText('The changes will apply to your current space only')
    ).toBeInTheDocument();
  });

  it('should call onDismissCallout when dismiss button is clicked', async () => {
    renderWithI18n(<SpaceCallout onDismissCallout={onDismissCallout} />);
    const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
    await userEvent.click(dismissButton);
    expect(onDismissCallout).toHaveBeenCalledTimes(1);
  });
});
