/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PresentationPanelError } from './presentation_panel_error';

describe('PresentationPanelError', () => {
  test('should display error', async () => {
    render(<PresentationPanelError error={new Error('Simulated error')} />);
    await waitFor(() => screen.getByTestId('errorMessageMarkdown'));
  });

  test('should display error with empty message', async () => {
    render(<PresentationPanelError error={new Error('')} />);
    await waitFor(() => screen.getByTestId('errorMessageMarkdown'));
  });
});
