/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TopNavMenuItemBetaProps } from './top_nav_menu_item_beta';
import { TopNavMenuItemBeta } from './top_nav_menu_item_beta';

describe('TopNavMenuItemBeta', () => {
  const defaultProps: TopNavMenuItemBetaProps = {
    label: 'elastic',
    run: jest.fn(),
    closePopover: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders basic item', () => {
    render(<TopNavMenuItemBeta {...defaultProps} testId="test-button" />);
    expect(screen.getByTestId('test-button')).toBeInTheDocument();
    expect(screen.getByText('Elastic')).toBeInTheDocument();
  });

  it('renders as link when href is provided', () => {
    render(<TopNavMenuItemBeta {...defaultProps} href="http://elastic.co" testId="test-link" />);
    const link = screen.getByTestId('test-link');
    expect(link).toHaveAttribute('href', 'http://elastic.co');
  });
});
