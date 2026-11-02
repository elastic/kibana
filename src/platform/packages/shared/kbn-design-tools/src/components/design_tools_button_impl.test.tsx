/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { DesignToolsButtonImpl } from './design_tools_button_impl';

jest.mock('./edit/library/eui_icon_cache', () => ({
  preloadAllEuiIcons: jest.fn().mockResolvedValue(undefined),
  getIconTypes: jest.fn().mockResolvedValue([]),
}));

describe('DesignToolsButtonImpl', () => {
  it('should render the button', () => {
    renderWithI18n(<DesignToolsButtonImpl />);

    expect(screen.getByTestId('designToolsButton')).toBeInTheDocument();
  });

  it('should open context menu when clicked', async () => {
    renderWithI18n(<DesignToolsButtonImpl />);

    await userEvent.click(screen.getByTestId('designToolsButton'));

    expect(screen.getByTestId('designToolsToggleLayout')).toBeInTheDocument();
    expect(screen.getByTestId('designToolsLayoutSettings')).toBeInTheDocument();
  });

  it('should toggle layout visibility when Toggle layout is clicked', async () => {
    renderWithI18n(<DesignToolsButtonImpl />);

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('designToolsToggleLayout'));
    });

    expect(screen.getByTestId('layoutOverlayContainer')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('designToolsToggleLayout'));
    });

    expect(screen.queryByTestId('layoutOverlayContainer')).not.toBeInTheDocument();
  });

  it('should open flyout when Layout settings is clicked', async () => {
    renderWithI18n(<DesignToolsButtonImpl />);

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('designToolsLayoutSettings'));
    });

    expect(screen.getByTestId('layoutSettingsCount')).toBeInTheDocument();
  });

  it('should close flyout via the flyout close button', async () => {
    renderWithI18n(<DesignToolsButtonImpl />);

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('designToolsLayoutSettings'));
    });

    expect(screen.getByTestId('layoutSettingsCount')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(screen.queryByTestId('layoutSettingsCount')).not.toBeInTheDocument();
  });

  it('should prevent target from losing focus on mouse down', () => {
    renderWithI18n(<DesignToolsButtonImpl />);

    const button = screen.getByTestId('designToolsButton');
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(button, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
