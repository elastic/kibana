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
import { CopyInput } from './copy_input';

describe('CopyInput', () => {
  const originalExecCommand = document.execCommand;

  beforeEach(() => {
    document.execCommand = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
  });

  it('renders the value', () => {
    render(<CopyInput value="secret-value" />);

    expect(screen.getByText('secret-value')).toBeInTheDocument();
  });

  it('calls onCopyClick and onCopySuccess when copying', async () => {
    const user = userEvent.setup();
    const onCopyClick = jest.fn();
    const onCopySuccess = jest.fn();

    render(
      <CopyInput value="secret-value" onCopyClick={onCopyClick} onCopySuccess={onCopySuccess} />
    );

    await user.click(screen.getByLabelText('Copy to clipboard'));

    expect(onCopyClick).toHaveBeenCalled();
    expect(onCopySuccess).toHaveBeenCalled();
  });

  it('adds hint text and aria-describedby when provided', () => {
    render(<CopyInput value="secret-value" screenReaderHint="Hint text" />);

    const button = screen.getByLabelText('Copy to clipboard');
    const hint = screen.getByText('Hint text');

    expect(button).toHaveAttribute('aria-describedby', hint.getAttribute('id'));
  });
});
