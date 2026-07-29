/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { ProjectPickerButton } from './button';

const defaultProps = {
  onClick: jest.fn(),
  size: 's' as const,
  filteredProjectsCount: 1000,
  totalProjectsCount: 10000,
};

const renderButton = (props: Partial<typeof defaultProps> & { isDisabled?: boolean } = {}) =>
  render(
    <EuiThemeProvider>
      <ProjectPickerButton {...defaultProps} {...props} />
    </EuiThemeProvider>
  );

describe('ProjectPickerButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the button with text showing the number of filtered projects and the total number of projects', () => {
    renderButton();
    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('1k/10k');
  });

  it('should render the button with text showing "All" when all projects are selected', () => {
    renderButton({
      filteredProjectsCount: 10000,
      totalProjectsCount: 10000,
    });
    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('All');
  });

  it('should render the enabled button with the default test subject', () => {
    renderButton();
    expect(screen.getByTestId('cps-project-picker-button')).toBeInTheDocument();
    expect(screen.queryByTestId('cps-project-picker-button-disabled')).not.toBeInTheDocument();
  });

  it('should call onClick when the button is clicked', async () => {
    const onClick = jest.fn();
    renderButton({ onClick });

    await userEvent.click(screen.getByTestId('cps-project-picker-button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render as disabled without a label when isDisabled is true', () => {
    renderButton({ isDisabled: true });

    const button = screen.getByTestId('cps-project-picker-button-disabled');
    expect(button).toBeDisabled();
    expect(screen.queryByTestId('cps-project-picker-button-label')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cps-project-picker-button')).not.toBeInTheDocument();
  });
});
