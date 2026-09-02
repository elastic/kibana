/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { TestChromeProviders } from '../../test_helpers';
import { MilestoneBadge } from './milestone_badge';

describe('MilestoneBadge', () => {
  it('renders the full-width milestone panel', () => {
    renderWithI18n(
      <TestChromeProviders>
        <MilestoneBadge />
      </TestChromeProviders>
    );

    expect(screen.getByTestId('chromeNextGlobalHeaderMilestone')).toHaveTextContent('V1 Milestone');
    expect(screen.getByTestId('chromeNextGlobalHeaderMilestoneReadMore')).toBeInTheDocument();
  });

  it('opens the prototype details flyout', async () => {
    renderWithI18n(
      <TestChromeProviders>
        <MilestoneBadge />
      </TestChromeProviders>
    );

    await userEvent.click(screen.getByTestId('chromeNextGlobalHeaderMilestoneReadMore'));

    expect(screen.getByTestId('chromeNextGlobalHeaderMilestoneFlyout')).toBeInTheDocument();
    expect(screen.getByText('About this prototype')).toBeInTheDocument();
  });
});
