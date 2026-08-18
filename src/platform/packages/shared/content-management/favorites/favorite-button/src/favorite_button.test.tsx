/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FavoriteButton } from './favorite_button';

describe('FavoriteButton', () => {
  const addLabel = 'Add to Starred';
  const removeLabel = 'Remove from Starred';

  it('renders unfavorited state with empty star and add label', () => {
    const onClick = jest.fn();
    render(
      <FavoriteButton
        status="unfavorited"
        onClick={onClick}
        addLabel={addLabel}
        removeLabel={removeLabel}
        data-test-subj="favoriteButton"
      />
    );

    const button = screen.getByRole('button', { name: addLabel });
    expect(button).toHaveAttribute('data-test-subj', 'favoriteButton');
    expect(button.querySelector('[data-euiicon-type="star"]')).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders favorited state with filled star and remove label', () => {
    render(
      <FavoriteButton
        status="favorited"
        onClick={jest.fn()}
        addLabel={addLabel}
        removeLabel={removeLabel}
      />
    );

    const button = screen.getByRole('button', { name: removeLabel });
    expect(button.querySelector('[data-euiicon-type="starFill"]')).toBeInTheDocument();
  });

  it('renders adding state with filled star', () => {
    render(
      <FavoriteButton
        status="adding"
        onClick={jest.fn()}
        addLabel={addLabel}
        removeLabel={removeLabel}
      />
    );

    expect(screen.getByRole('button', { name: removeLabel })).toBeInTheDocument();
    expect(
      screen
        .getByRole('button', { name: removeLabel })
        .querySelector('[data-euiicon-type="starFill"]')
    ).toBeInTheDocument();
  });

  it('renders removing state as loading with remove label', () => {
    const { container } = render(
      <FavoriteButton
        status="removing"
        onClick={jest.fn()}
        addLabel={addLabel}
        removeLabel={removeLabel}
      />
    );

    expect(screen.getByRole('button', { name: removeLabel })).toBeInTheDocument();
    expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });
});
