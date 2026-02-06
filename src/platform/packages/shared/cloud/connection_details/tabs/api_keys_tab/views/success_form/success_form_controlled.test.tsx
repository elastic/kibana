/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessFormControlled } from './success_form_controlled';
import type { ApiKey } from './types';

jest.mock('../../components/manage_keys_link', () => ({
  ManageKeysLink: () => <div data-test-subj="manageKeysLink" />,
}));

describe('SuccessFormControlled', () => {
  const apiKey: ApiKey = {
    id: 'api-id',
    name: 'api-name',
    key: 'api-key',
    encoded: 'encoded-key',
  };
  const originalExecCommand = document.execCommand;

  beforeAll(() => {
    document.execCommand = jest.fn().mockReturnValue(true);
  });

  afterAll(() => {
    document.execCommand = originalExecCommand;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders screen reader announcement text', async () => {
    render(<SuccessFormControlled apiKey={apiKey} format="encoded" onFormatChange={jest.fn()} />);

    expect(
      await screen.findByText(
        'API key created successfully. Current format is Encoded. You can change the format in the dropdown and copy the API key using the copy button.'
      )
    ).toBeInTheDocument();
  });

  it('announces copy success with format label', async () => {
    const user = userEvent.setup();

    render(<SuccessFormControlled apiKey={apiKey} format="beats" onFormatChange={jest.fn()} />);

    await user.click(screen.getByLabelText('Copy to clipboard'));

    expect(
      await screen.findByText('API key copied to clipboard in Beats format.')
    ).toBeInTheDocument();
  });
});
