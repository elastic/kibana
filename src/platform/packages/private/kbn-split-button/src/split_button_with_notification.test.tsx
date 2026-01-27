/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { SplitButtonWithNotification } from './split_button_with_notification';

const setup = (props: Partial<React.ComponentProps<typeof SplitButtonWithNotification>> = {}) => {
  const secondaryButtonIcon = 'clock';
  const onMainButtonClick = jest.fn();
  const onSecondaryButtonClick = jest.fn();

  const user = userEvent.setup();

  const { container } = render(
    <SplitButtonWithNotification
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

describe('<SplitButtonWithNotification />', () => {
  it('should render the notification indicator', () => {
    // Given
    setup({
      showNotificationIndicator: true,
    });

    // When
    const notificationIndicator = screen.getByTestId('split-button-notification-indicator');

    // Then
    expect(notificationIndicator).toBeVisible();
  });
});
