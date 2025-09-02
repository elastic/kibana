/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { LoadingSpinner } from './loading_spinner';
import { render, screen } from '@testing-library/react';

describe('Loading spinner', function () {
  it('renders "Searching" text and a spinner', () => {
    render(
      <DiscoverTestProvider>
        <LoadingSpinner />
      </DiscoverTestProvider>
    );

    expect(screen.getByText(/searching/i)).toBeVisible();
    expect(screen.getByRole('progressbar')).toBeVisible();
  });
});
