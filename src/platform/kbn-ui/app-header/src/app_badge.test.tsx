/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppBadge } from './app_badge';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

describe('AppBadge', () => {
  it('does not put a static text badge in the tab order', () => {
    render(<AppBadge badge={{ label: 'Beta' }} />);

    const badge = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.badge);
    expect(badge).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button', { name: 'Beta' })).not.toBeInTheDocument();
  });

  it('makes a tooltip-only badge keyboard focusable in addition to existing interactive badges', () => {
    render(
      <AppBadge
        badge={{
          label: 'System watch',
          tooltip: 'You cannot deactivate or delete a system watch.',
        }}
      />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.badge)).toHaveAttribute('tabindex', '0');
  });

  it('keeps a clickable badge as a button that still fires onClick, including with a tooltip', () => {
    const onClick = jest.fn();
    render(
      <AppBadge
        badge={{
          label: 'Tech Preview',
          tooltip: 'This feature is in tech preview.',
          onClick,
          onClickAriaLabel: 'Learn more',
        }}
      />
    );

    const badge = screen.getByRole('button', { name: 'Learn more' });
    expect(badge).toBeInTheDocument();
    fireEvent.click(badge);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps a menu badge as a button that still opens its menu', async () => {
    const onItemClick = jest.fn();
    render(
      <AppBadge
        badge={{
          label: 'Managed',
          tooltip: 'Managed by Elastic.',
          items: [{ name: 'View details', onClick: onItemClick }],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Click Managed badge' }));
    fireEvent.click(await screen.findByText('View details'));
    await waitFor(() => expect(onItemClick).toHaveBeenCalledTimes(1));
  });
});
