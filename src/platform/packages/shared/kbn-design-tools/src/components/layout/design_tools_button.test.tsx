/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { DesignToolsButton } from './design_tools_button';

describe('DesignToolsButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render the button', () => {
    renderWithI18n(<DesignToolsButton />);

    expect(screen.getByTestId('designToolsButton')).toBeInTheDocument();
  });

  it('should open context menu when clicked', async () => {
    renderWithI18n(<DesignToolsButton />);

    await userEvent.click(screen.getByTestId('designToolsButton'));

    expect(screen.getByText('Show layout')).toBeInTheDocument();
    expect(screen.getByText('Layout settings')).toBeInTheDocument();
  });

  it('should toggle layout visibility when Toggle layout is clicked', async () => {
    renderWithI18n(<DesignToolsButton />);

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Show layout'));
    });

    expect(screen.getByTestId('layoutOverlayContainer')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Hide layout'));
    });

    expect(screen.queryByTestId('layoutOverlayContainer')).not.toBeInTheDocument();
  });

  it('should open flyout when Layout settings is clicked', async () => {
    renderWithI18n(<DesignToolsButton />);

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Layout settings'));
    });

    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  it('should close flyout via the flyout close button', async () => {
    renderWithI18n(<DesignToolsButton />);

    await userEvent.click(screen.getByTestId('designToolsButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Layout settings'));
    });

    expect(screen.getByText('Count')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(screen.queryByText('Count')).not.toBeInTheDocument();
  });

  it('should prevent target from losing focus on mouse down', () => {
    renderWithI18n(<DesignToolsButton />);

    const button = screen.getByTestId('designToolsButton');
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(button, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
