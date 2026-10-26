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
import { EuiThemeProvider } from '@elastic/eui';
import { ToggleAccordionButton, TOGGLE_BUTTON_WIDTH } from './toggle_accordion_button';

function renderWithTheme(component: React.ReactNode) {
  return render(<EuiThemeProvider>{component}</EuiThemeProvider>);
}

describe('ToggleAccordionButton', () => {
  const defaultProps = {
    isOpen: true,
    childrenCount: 3,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the toggle button', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} />);

      expect(screen.getByTestId('toggleAccordionButton')).toBeInTheDocument();
    });

    it('has the correct aria-label', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Toggle accordion' })).toBeInTheDocument();
    });

    it('is focusable via tabIndex', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} />);

      expect(screen.getByTestId('toggleAccordionButton')).toHaveAttribute('tabindex', '0');
    });

    it('exports TOGGLE_BUTTON_WIDTH as 20', () => {
      expect(TOGGLE_BUTTON_WIDTH).toBe(20);
    });
  });

  describe('chevron icon direction', () => {
    it('shows chevronSingleDown icon when isOpen is true', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} isOpen={true} />);

      expect(
        screen
          .getByTestId('toggleAccordionButton')
          .querySelector('[data-euiicon-type="chevronSingleDown"]')
      ).toBeInTheDocument();
    });

    it('shows chevronSingleRight icon when isOpen is false', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} isOpen={false} />);

      expect(
        screen
          .getByTestId('toggleAccordionButton')
          .querySelector('[data-euiicon-type="chevronSingleRight"]')
      ).toBeInTheDocument();
    });
  });

  describe('children count display', () => {
    it('shows the children count as a number below 1000', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} childrenCount={5} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('formats count as "1k" for 1000', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} childrenCount={1000} />);

      expect(screen.getByText('1k')).toBeInTheDocument();
    });

    it('formats count as "3k" for 2500 (rounds to nearest integer)', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} childrenCount={2500} />);

      expect(screen.getByText('3k')).toBeInTheDocument();
    });

    it('formats count as "1m" for 1_000_000', () => {
      renderWithTheme(<ToggleAccordionButton {...defaultProps} childrenCount={1_000_000} />);

      expect(screen.getByText('1m')).toBeInTheDocument();
    });
  });

  describe('click interaction', () => {
    it('calls onClick when clicked', () => {
      const onClick = jest.fn();
      renderWithTheme(<ToggleAccordionButton {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByTestId('toggleAccordionButton'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Enter key is pressed', () => {
      const onClick = jest.fn();
      renderWithTheme(<ToggleAccordionButton {...defaultProps} onClick={onClick} />);

      fireEvent.keyDown(screen.getByTestId('toggleAccordionButton'), { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick when Space key is pressed', () => {
      const onClick = jest.fn();
      renderWithTheme(<ToggleAccordionButton {...defaultProps} onClick={onClick} />);

      fireEvent.keyDown(screen.getByTestId('toggleAccordionButton'), { key: ' ' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick for other keys', () => {
      const onClick = jest.fn();
      renderWithTheme(<ToggleAccordionButton {...defaultProps} onClick={onClick} />);

      fireEvent.keyDown(screen.getByTestId('toggleAccordionButton'), { key: 'Tab' });
      fireEvent.keyDown(screen.getByTestId('toggleAccordionButton'), { key: 'Escape' });
      fireEvent.keyDown(screen.getByTestId('toggleAccordionButton'), { key: 'ArrowDown' });

      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
