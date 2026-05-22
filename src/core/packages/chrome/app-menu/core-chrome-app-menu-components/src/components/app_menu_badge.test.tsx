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
import { AppMenuBadge } from './app_menu_badge';

describe('AppMenuBadge', () => {
  it('should render the badge text', () => {
    render(<AppMenuBadge text="New" />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should apply the data-test-subj attribute', () => {
    render(<AppMenuBadge text="Beta" data-test-subj="my-badge" />);
    expect(screen.getByTestId('my-badge')).toBeInTheDocument();
  });

  it('should not render a data-test-subj when not provided', () => {
    const { container } = render(<AppMenuBadge text="New" />);
    const badge = container.querySelector('.euiBadge');
    expect(badge).not.toHaveAttribute('data-test-subj');
  });
});
