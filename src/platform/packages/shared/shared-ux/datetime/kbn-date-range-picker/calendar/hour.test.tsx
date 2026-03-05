/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { Hour } from './hour';

describe('Hour', () => {
  it('renders as unselected by default when isSelected is omitted', () => {
    renderWithEuiTheme(<Hour onClick={() => {}}>10:00</Hour>);

    expect(screen.getByRole('button', { name: '10:00' })).not.toHaveAttribute('aria-current');
  });

  it('renders as selected when isSelected is true', () => {
    renderWithEuiTheme(
      <Hour onClick={() => {}} isSelected>
        10:00
      </Hour>
    );

    expect(screen.getByRole('button', { name: '10:00' })).toHaveAttribute('aria-current', 'true');
  });

  it('renders as unselected when isSelected is false', () => {
    renderWithEuiTheme(
      <Hour onClick={() => {}} isSelected={false}>
        10:00
      </Hour>
    );

    expect(screen.getByRole('button', { name: '10:00' })).not.toHaveAttribute('aria-current');
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    renderWithEuiTheme(<Hour onClick={onClick}>10:00</Hour>);

    fireEvent.click(screen.getByRole('button', { name: '10:00' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
