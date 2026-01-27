/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithTheme } from '../../../utils/test_helpers';
import { CriticalPathToggle } from './critical_path_toggle';

describe('CriticalPathToggle', () => {
  it('renders with correct label and calls onChange', () => {
    const onChange = jest.fn();
    renderWithTheme(<CriticalPathToggle checked={false} onChange={onChange} />);

    const toggle = screen.getByTestId('criticalPathToggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
