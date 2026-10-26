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

import { getNoDataCardServicesMock } from '@kbn/shared-ux-card-no-data-mocks';

import { NoDataCard } from './no_data_card';
import { NoDataCardProvider } from './services';

describe('NoDataCard', () => {
  const renderWithProvider = (element: React.ReactElement, canAccessFleet: boolean = true) => {
    return render(
      <NoDataCardProvider {...getNoDataCardServicesMock({ canAccessFleet })}>
        {element}
      </NoDataCardProvider>
    );
  };

  test('integrates with services correctly', () => {
    const { rerender } = renderWithProvider(
      <NoDataCard buttonText="Browse" title="Card title" description="Description" />
    );

    // Test service integration: addBasePath
    const button = screen.getByRole('link', { name: 'Browse' });
    expect(button).toHaveAttribute('href', expect.stringContaining('/app/integrations/browse'));

    // Test service integration: canAccessFleet affects component behavior
    rerender(
      <NoDataCardProvider {...getNoDataCardServicesMock({ canAccessFleet: false })}>
        <NoDataCard buttonText="Browse" title="Card title" description="Description" />
      </NoDataCardProvider>
    );

    // Focus on the service effect: button disappears when no fleet access
    expect(screen.queryByRole('link', { name: 'Browse' })).not.toBeInTheDocument();
  });
});
