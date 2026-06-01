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
import { PrimaryLabelsToggle } from './primary_labels_toggle';

describe('PrimaryLabelsToggle', () => {
  const onChange = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the toggle label', () => {
    renderWithI18n(
      <PrimaryLabelsToggle showPrimaryItemLabels={true} onChange={onChange} />
    );
    expect(screen.getByText('Show apps labels')).toBeInTheDocument();
  });

  it('should call onChange when toggled', async () => {
    renderWithI18n(
      <PrimaryLabelsToggle showPrimaryItemLabels={true} onChange={onChange} />
    );
    await userEvent.click(screen.getByTestId('customizeNavigationShowPrimaryLabelsToggle'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
