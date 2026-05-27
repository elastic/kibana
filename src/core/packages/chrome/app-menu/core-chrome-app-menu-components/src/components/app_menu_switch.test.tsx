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
import { AppMenuSwitchComponent } from './app_menu_switch';
import type { AppMenuSwitch } from '../types';

describe('AppMenuSwitchComponent', () => {
  const defaultSwitchConfig: AppMenuSwitch = {
    id: 'test-switch',
    label: 'Test switch',
    labelProps: { className: 'test-label' },
    checked: false,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with the correct label', () => {
    render(<AppMenuSwitchComponent switchConfig={defaultSwitchConfig} />);

    expect(screen.getByText('Test switch')).toBeInTheDocument();
  });

  it('should call onChange with the new checked value when toggled', () => {
    const onChange = jest.fn();
    render(<AppMenuSwitchComponent switchConfig={{ ...defaultSwitchConfig, onChange }} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
