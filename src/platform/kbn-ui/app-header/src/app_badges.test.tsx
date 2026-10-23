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
import { AppBadges } from './app_badges';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

describe('AppBadges', () => {
  it('closes the overflow popover after a hidden badge is clicked', async () => {
    const onClick = jest.fn();
    render(
      <AppBadges
        badges={[
          { label: 'One' },
          { label: 'Two' },
          { label: 'Three', onClick, onClickAriaLabel: 'Open three' },
          { label: 'Four' },
        ]}
      />
    );

    fireEvent.click(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.badgesOverflow));
    fireEvent.click(await screen.findByRole('button', { name: 'Open three' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Open three' })).not.toBeInTheDocument()
    );
  });
});
