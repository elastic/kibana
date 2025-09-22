/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CascadeRowActions } from './cascade_row_actions';

describe('CascadeRowActions', () => {
  const headerRowActions = [
    {
      label: 'Action 1',
      iconType: 'pencil',
      onClick: jest.fn(),
    },
    {
      label: 'Action 2',
      iconType: 'trash',
      onClick: jest.fn(),
    },
    {
      label: 'Action 3',
      iconType: 'eye',
      onClick: jest.fn(),
    },
  ];

  it('will only render the first two actions by default', () => {
    render(<CascadeRowActions headerRowActions={headerRowActions} />);

    // Check that the first two actions are visible
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
    expect(screen.queryByText('Action 3')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Select more options')).toBeInTheDocument();
  });

  it('clicking the select more options button reveals additional actions', () => {
    render(<CascadeRowActions headerRowActions={headerRowActions} />);

    // Click the "Select more options" button
    fireEvent.click(screen.getByLabelText('Select more options'));

    // Check that the third action is now visible
    expect(screen.getByText('Action 3')).toBeInTheDocument();
  });
});
