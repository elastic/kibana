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
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { FlyoutPanel } from './flyout_panel';

describe('FlyoutPanel', () => {
  it('renders', () => {
    renderWithKibanaRenderContext(
      <FlyoutPanel title="My panel">
        <p>panel content</p>
      </FlyoutPanel>
    );

    expect(screen.getByRole('heading', { level: 4, name: 'My panel' })).toBeInTheDocument();
    expect(screen.getByText('panel content')).toBeInTheDocument();
  });
});
