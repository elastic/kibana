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
import { GridButton } from './grid_button';

describe('GridButton', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render the button', () => {
    renderWithI18n(<GridButton />);

    expect(screen.getByTestId('gridOverlayButton')).toBeInTheDocument();
  });

  it('should open context menu when clicked', async () => {
    renderWithI18n(<GridButton />);

    await userEvent.click(screen.getByTestId('gridOverlayButton'));

    expect(screen.getByText('Toggle grid')).toBeInTheDocument();
    expect(screen.getByText('Grid settings')).toBeInTheDocument();
  });

  it('should toggle grid visibility when Toggle grid is clicked', async () => {
    renderWithI18n(<GridButton />);

    await userEvent.click(screen.getByTestId('gridOverlayButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Toggle grid'));
    });

    expect(screen.getByTestId('gridOverlayContainer')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('gridOverlayButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Toggle grid'));
    });

    expect(screen.queryByTestId('gridOverlayContainer')).not.toBeInTheDocument();
  });

  it('should open flyout when Grid settings is clicked', async () => {
    renderWithI18n(<GridButton />);

    await userEvent.click(screen.getByTestId('gridOverlayButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Grid settings'));
    });

    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  it('should close flyout via the flyout close button', async () => {
    renderWithI18n(<GridButton />);

    await userEvent.click(screen.getByTestId('gridOverlayButton'));
    await act(async () => {
      fireEvent.click(screen.getByText('Grid settings'));
    });

    expect(screen.getByText('Count')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(screen.queryByText('Count')).not.toBeInTheDocument();
  });

  it('should prevent target from losing focus on mouse down', () => {
    renderWithI18n(<GridButton />);

    const button = screen.getByTestId('gridOverlayButton');
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(button, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
