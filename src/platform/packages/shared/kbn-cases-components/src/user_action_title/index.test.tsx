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

import { UserActionTitle } from '.';

describe('UserActionTitle', () => {
  it('renders a label without a link', () => {
    render(<UserActionTitle dataTestSubj="test-1" label="added event" />);

    const el = screen.getByTestId('test-1');
    expect(el).toHaveTextContent('added event');
    expect(screen.queryByTestId('user-action-link')).not.toBeInTheDocument();
  });

  it('renders a label with a link', () => {
    render(
      <UserActionTitle
        dataTestSubj="test-2"
        label="added an alert from"
        link={{
          targetId: 'rule-1',
          label: 'My Rule',
          getHref: jest.fn().mockReturnValue('https://example.com'),
          onClick: jest.fn(),
        }}
      />
    );

    const el = screen.getByTestId('test-2');
    expect(el).toHaveTextContent('added an alert from My Rule');
    expect(screen.getByTestId('user-action-link')).toHaveTextContent('My Rule');
  });

  it('renders a label with a link showing fallback label', () => {
    render(
      <UserActionTitle
        dataTestSubj="test-3"
        label="added an alert from"
        link={{
          targetId: 'rule-1',
          label: null,
          fallbackLabel: 'Unknown rule',
          getHref: jest.fn().mockReturnValue('https://example.com'),
        }}
      />
    );

    expect(screen.getByTestId('test-3')).toHaveTextContent('added an alert from Unknown rule');
  });

  it('renders a label with a link in loading state', () => {
    render(
      <UserActionTitle
        dataTestSubj="test-4"
        label="added an alert from"
        link={{
          targetId: 'rule-1',
          label: 'My Rule',
          isLoading: true,
        }}
      />
    );

    expect(screen.getByTestId('user-action-link-loading')).toBeInTheDocument();
  });
});
