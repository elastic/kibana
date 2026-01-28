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
import { ToolbarButton } from './toolbar_button';

describe('ToolbarButton', () => {
  const defaultProps = {
    onClick: jest.fn(),
    children: 'Click me',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children content', () => {
      render(<ToolbarButton {...defaultProps}>Button Text</ToolbarButton>);
      expect(screen.getByText('Button Text')).toBeInTheDocument();
    });

    it('renders with icon when iconType is provided', () => {
      render(
        <ToolbarButton {...defaultProps} iconType="plus">
          Add Item
        </ToolbarButton>
      );
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(
        <ToolbarButton {...defaultProps} data-test-subj="customButton">
          Test
        </ToolbarButton>
      );
      expect(screen.getByTestId('customButton')).toBeInTheDocument();
    });

    it('renders as a button element', () => {
      render(<ToolbarButton {...defaultProps}>Button</ToolbarButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('color variants', () => {
    it('renders with primary color by default', () => {
      render(<ToolbarButton {...defaultProps}>Primary</ToolbarButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with success color when specified', () => {
      render(
        <ToolbarButton {...defaultProps} color="success">
          Success
        </ToolbarButton>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with danger color when specified', () => {
      render(
        <ToolbarButton {...defaultProps} color="danger">
          Danger
        </ToolbarButton>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with warning color when specified', () => {
      render(
        <ToolbarButton {...defaultProps} color="warning">
          Warning
        </ToolbarButton>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with text color when specified', () => {
      render(
        <ToolbarButton {...defaultProps} color="text">
          Text
        </ToolbarButton>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with accent color when specified', () => {
      render(
        <ToolbarButton {...defaultProps} color="accent">
          Accent
        </ToolbarButton>
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<ToolbarButton onClick={handleClick}>Clickable</ToolbarButton>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('passes click event to onClick handler', () => {
      const handleClick = jest.fn();
      render(<ToolbarButton onClick={handleClick}>Clickable</ToolbarButton>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
