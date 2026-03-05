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
import '@testing-library/jest-dom';
import { ChromeComponentsProvider } from '../context';
import { createMockChromeComponentsDeps } from '../test_helpers';
import { ChromelessHeader } from './chromeless_header';

describe('ChromelessHeader', () => {
  it('renders the chromeless header container', () => {
    render(
      <ChromeComponentsProvider value={createMockChromeComponentsDeps()}>
        <ChromelessHeader />
      </ChromeComponentsProvider>
    );
    expect(screen.getByTestId('kibanaHeaderChromeless')).toBeInTheDocument();
  });

  it('throws when rendered outside ChromeComponentsProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ChromelessHeader />)).toThrow(
      'useChromeComponentsDeps must be used within ChromeComponentsProvider'
    );
    consoleError.mockRestore();
  });
});
