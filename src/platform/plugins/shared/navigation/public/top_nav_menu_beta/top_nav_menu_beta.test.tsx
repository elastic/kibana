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
import { TopNavMenuBeta } from './top_nav_menu_beta';
import type { TopNavMenuConfigBeta } from './types';

// Mock useIsWithinBreakpoints to control responsive behavior
const mockUseIsWithinBreakpoints = jest.fn();
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: (breakpoints: string[]) => mockUseIsWithinBreakpoints(breakpoints),
  };
});

describe('TopNavMenuBeta', () => {
  const defaultItems = [
    { id: 'item1', label: 'Item 1', run: jest.fn(), iconType: 'gear', order: 1 },
    { id: 'item2', label: 'Item 2', run: jest.fn(), iconType: 'search', order: 2 },
  ];

  const defaultConfig: TopNavMenuConfigBeta = {
    items: defaultItems,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to xl breakpoint (shows all items)
    mockUseIsWithinBreakpoints.mockImplementation((breakpoints: string[]) => {
      if (breakpoints.includes('xl')) return true;
      return false;
    });
  });

  describe('rendering', () => {
    it('should return null when config is undefined', () => {
      const { container } = render(<TopNavMenuBeta config={undefined} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should return null when config has no items', () => {
      const { container } = render(<TopNavMenuBeta config={{}} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should return null when visible is false', () => {
      const { container } = render(<TopNavMenuBeta config={defaultConfig} visible={false} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should render the top nav menu when config has items', () => {
      render(<TopNavMenuBeta config={defaultConfig} />);

      expect(screen.getByTestId('top-nav')).toBeInTheDocument();
    });

    it('should render menu items at xl breakpoint', () => {
      render(<TopNavMenuBeta config={defaultConfig} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('action items', () => {
    it('should render primary action item', () => {
      const configWithPrimary: TopNavMenuConfigBeta = {
        primaryActionItem: {
          id: 'save',
          label: 'Save',
          run: jest.fn(),
          iconType: 'save',
        },
      };

      render(<TopNavMenuBeta config={configWithPrimary} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should render secondary action item', () => {
      const configWithSecondary: TopNavMenuConfigBeta = {
        secondaryActionItem: {
          id: 'cancel',
          label: 'Cancel',
          run: jest.fn(),
          iconType: 'cross',
        },
      };

      render(<TopNavMenuBeta config={configWithSecondary} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should render both primary and secondary action items', () => {
      const configWithBoth: TopNavMenuConfigBeta = {
        primaryActionItem: {
          id: 'save',
          label: 'Save',
          run: jest.fn(),
          iconType: 'save',
        },
        secondaryActionItem: {
          id: 'cancel',
          label: 'Cancel',
          run: jest.fn(),
          iconType: 'cross',
        },
      };

      render(<TopNavMenuBeta config={configWithBoth} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should render overflow button at m-l breakpoint', () => {
      mockUseIsWithinBreakpoints.mockImplementation((breakpoints: string[]) => {
        if (breakpoints.includes('m') && breakpoints.includes('l')) return true;
        return false;
      });

      render(<TopNavMenuBeta config={defaultConfig} />);

      expect(screen.getByTestId('top-nav-menu-overflow-button')).toBeInTheDocument();
    });

    it('should render overflow button with all items at small breakpoint', () => {
      mockUseIsWithinBreakpoints.mockReturnValue(false);

      render(<TopNavMenuBeta config={defaultConfig} />);

      expect(screen.getByTestId('top-nav-menu-overflow-button')).toBeInTheDocument();
    });

    it('should render individual menu items at xl breakpoint', () => {
      mockUseIsWithinBreakpoints.mockImplementation((breakpoints: string[]) => {
        if (breakpoints.includes('xl')) return true;
        return false;
      });

      render(<TopNavMenuBeta config={defaultConfig} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});
