/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { SplitButton } from './split_button';
import React from 'react';
import userEvent from '@testing-library/user-event';

const setup = (props: Partial<React.ComponentProps<typeof SplitButton>> = {}) => {
  const secondaryButtonIcon = 'clock';
  const onMainButtonClick = jest.fn();
  const onSecondaryButtonClick = jest.fn();

  const user = userEvent.setup();

  const { container } = render(
    <SplitButton
      data-test-subj="split-button"
      onClick={onMainButtonClick}
      onSecondaryButtonClick={onSecondaryButtonClick}
      secondaryButtonIcon={secondaryButtonIcon}
      {...props}
    />
  );

  return {
    secondaryButtonIcon,
    onMainButtonClick,
    onSecondaryButtonClick,
    user,
    container,
  };
};

describe('<SplitButton />', () => {
  describe('given a primary icon', () => {
    it('should render the primary button icon', () => {
      // Given
      const primaryButtonIcon = 'plus';

      // When
      const { container } = setup({ iconType: primaryButtonIcon });

      // Then
      const primaryButton = screen.getByTestId('split-button');
      const iconSpan = container.querySelector('span[data-euiicon-type]');

      expect(primaryButton).toBeVisible();
      expect(iconSpan).toHaveAttribute('data-euiicon-type', primaryButtonIcon);
    });
  });

  describe('given a secondary icon', () => {
    it('should render the secondary button icon', () => {
      // Given
      const secondaryButtonIcon = 'clock';

      // When
      const { container } = setup({ secondaryButtonIcon });

      // Then
      const secondaryButton = screen.getByTestId('split-button-secondary-button');
      const iconSpan = container.querySelector('span[data-euiicon-type]');

      expect(secondaryButton).toBeVisible();
      expect(iconSpan).toHaveAttribute('data-euiicon-type', secondaryButtonIcon);
    });
  });

  describe('when the primary button is clicked', () => {
    it('should call the onClick handler', async () => {
      // Given
      const { user, onMainButtonClick } = setup();

      // When
      const primaryButton = screen.getByTestId('split-button');
      await user.click(primaryButton);

      // Then
      expect(onMainButtonClick).toHaveBeenCalled();
    });
  });

  describe('when the secondary button is clicked', () => {
    it('should call the onSecondaryButtonClick handler', async () => {
      // Given
      const { user, onSecondaryButtonClick } = setup();

      // When
      const secondaryButton = screen.getByTestId('split-button-secondary-button');
      await user.click(secondaryButton);

      // Then
      expect(onSecondaryButtonClick).toHaveBeenCalled();
    });
  });
});
