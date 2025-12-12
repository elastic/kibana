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
import userEvent from '@testing-library/user-event';
import type { ProjectRoutingSwitchProps } from './project_routing_switch';
import { ProjectRoutingSwitch } from './project_routing_switch';
import { I18nProvider } from '@kbn/i18n-react';

describe('ProjectRoutingSwitch', () => {
  const renderComponent = (overrides?: Partial<ProjectRoutingSwitchProps>) => {
    const defaultProps: ProjectRoutingSwitchProps = {
      checked: false,
      onChange: jest.fn(),
    };
    return render(
      <I18nProvider>
        <ProjectRoutingSwitch {...defaultProps} {...overrides} />
      </I18nProvider>
    );
  };

  it('should render the switch with correct label', () => {
    renderComponent();

    const label = screen.getByText('Include cross-project search scope customizations');
    expect(label).toBeInTheDocument();
  });

  it('should render unchecked when checked prop is false', () => {
    renderComponent();

    const switchElement = screen.getByTestId('storeProjectRoutingWithSearch');
    expect(switchElement).not.toBeChecked();
  });

  it('should render checked when checked prop is true', () => {
    renderComponent({ checked: true });

    const switchElement = screen.getByTestId('storeProjectRoutingWithSearch');
    expect(switchElement).toBeChecked();
  });

  it('should call onChange with true when unchecked switch is clicked', async () => {
    const onChange = jest.fn();
    renderComponent({ onChange });

    const switchElement = screen.getByTestId('storeProjectRoutingWithSearch');
    await userEvent.click(switchElement);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('should call onChange with false when checked switch is clicked', async () => {
    const onChange = jest.fn();
    renderComponent({ checked: true, onChange });

    const switchElement = screen.getByTestId('storeProjectRoutingWithSearch');
    await userEvent.click(switchElement);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
