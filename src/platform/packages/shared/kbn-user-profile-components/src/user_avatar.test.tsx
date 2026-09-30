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

import { UserAvatar } from './user_avatar';

const delightedNightingale = {
  username: 'delighted_nightingale',
  email: 'delighted_nightingale@elastic.co',
  full_name: 'Delighted Nightingale',
};

const displayLabel = 'Delighted Nightingale (delighted_nightingale@elastic.co)';

describe('UserAvatar', () => {
  it('renders an image avatar with a built-in tooltip on hover', async () => {
    render(
      <UserAvatar
        user={delightedNightingale}
        avatar={{
          color: '#09e8ca',
          initials: 'DN',
          imageUrl: 'https://source.unsplash.com/64x64/?cat',
        }}
      />
    );

    await userEvent.hover(screen.getByRole('img'));
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(displayLabel);
    });
  });

  it('renders an initials avatar with a built-in tooltip on hover', async () => {
    render(
      <UserAvatar
        user={delightedNightingale}
        avatar={{
          color: '#09e8ca',
          initials: 'DN',
          imageUrl: undefined,
        }}
      />
    );

    expect(screen.getByText('DN')).toBeInTheDocument();

    await userEvent.hover(screen.getByRole('img'));
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(displayLabel);
    });
  });

  it('renders initials when avatar data is missing', async () => {
    render(<UserAvatar user={delightedNightingale} />);

    expect(screen.getByText('DN')).toBeInTheDocument();

    await userEvent.hover(screen.getByRole('img'));
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(displayLabel);
    });
  });

  it('renders a placeholder avatar when user data is missing', () => {
    render(<UserAvatar />);

    expect(screen.getByRole('img')).toHaveTextContent('?');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
