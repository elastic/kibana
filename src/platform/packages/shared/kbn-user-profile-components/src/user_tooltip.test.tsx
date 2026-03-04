/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { UserToolTip } from './user_tooltip';

describe('UserToolTip', () => {
  it('should render tooltip with user avatar, display name, and email on hover', async () => {
    render(
      <UserToolTip
        user={{
          username: 'delighted_nightingale',
          email: 'delighted_nightingale@elastic.co',
          full_name: 'Delighted Nightingale',
        }}
        avatar={{
          color: '#09e8ca',
          initials: 'DN',
          imageUrl: 'https://source.unsplash.com/64x64/?cat',
        }}
        position="top"
        delay="regular"
      >
        <button>Toggle</button>
      </UserToolTip>
    );

    expect(screen.getByText('Toggle')).toBeInTheDocument();

    await userEvent.hover(screen.getByText('Toggle'));
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    expect(screen.getByText('Delighted Nightingale')).toBeInTheDocument();
    expect(screen.getByText('delighted_nightingale@elastic.co')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Delighted Nightingale/ })).toBeInTheDocument();
  });
});
