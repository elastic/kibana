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
import { userEvent } from '@testing-library/user-event';
import { ColorModeKeyPad } from './color_mode_keypad';

describe('ColorModeKeyPad', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('shows a description instead of a duplicate Color mode legend', () => {
    render(<ColorModeKeyPad colorMode="light" onChange={onChange} />);

    expect(screen.getByRole('heading', { name: 'Color mode' })).toBeInTheDocument();
    expect(
      screen.getByText('This setting applies to the export, not the current appearance.')
    ).toBeInTheDocument();
    expect(screen.queryByText('This report will use the light theme.')).not.toBeInTheDocument();
    expect(screen.queryByText('Light is recommended for printed reports.')).not.toBeInTheDocument();
  });

  it('does not show a Recommended badge when print format is off', () => {
    render(<ColorModeKeyPad colorMode="light" onChange={onChange} />);

    expect(screen.queryByTestId('reportColorModeRecommended')).not.toBeInTheDocument();
  });

  it('shows a Recommended badge next to Color mode when print format is on', async () => {
    const user = userEvent.setup();
    render(<ColorModeKeyPad colorMode="light" onChange={onChange} usePrintLayout />);

    expect(screen.getByTestId('reportColorModeRecommended')).toHaveTextContent('Recommended');
    expect(screen.queryByText('This report will use the light theme.')).not.toBeInTheDocument();

    await user.hover(screen.getByTestId('reportColorModeRecommended'));

    expect(
      await screen.findByText('Light is recommended for printed reports.')
    ).toBeInTheDocument();
  });
});
