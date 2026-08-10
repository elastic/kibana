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
import type { EuiBreakpointSize } from '@elastic/eui';
import { AppMenuComponent } from './app_menu';
import type { AppMenuConfig, AppMenuItemType } from '../types';
import { APP_MENU_TEST_SUBJECTS } from '../test_subjects';

let mockCurrentBreakpoint: EuiBreakpointSize | undefined = 'xl';
let mockViewportBreakpoint: EuiBreakpointSize = 'xl';

jest.mock('@kbn/core-chrome-layout-utils', () => ({
  useCurrentChromeApplicationBreakpoint: () => mockCurrentBreakpoint,
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    useCurrentEuiBreakpoint: () => mockViewportBreakpoint,
  };
});

describe('AppMenu', () => {
  const defaultItems = [
    { id: 'item1', label: 'Item 1', run: jest.fn(), iconType: 'gear', order: 1 },
    { id: 'item2', label: 'Item 2', run: jest.fn(), iconType: 'magnify', order: 2 },
  ];

  const defaultConfig: AppMenuConfig = {
    items: defaultItems,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentBreakpoint = 'xl';
    mockViewportBreakpoint = 'xl';
  });

  describe('rendering', () => {
    it('should return null when config is undefined', () => {
      const { container } = render(<AppMenuComponent config={undefined} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should return null when config has no items', () => {
      const { container } = render(<AppMenuComponent config={{}} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should return null when visible is false', () => {
      const { container } = render(<AppMenuComponent config={defaultConfig} visible={false} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should render the top nav menu when config has items', () => {
      render(<AppMenuComponent config={defaultConfig} />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.root)).toBeInTheDocument();
    });

    it('should render menu items at the wide application breakpoint', () => {
      render(<AppMenuComponent config={defaultConfig} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('action items', () => {
    it('should render primary action item', () => {
      const configWithPrimary: AppMenuConfig = {
        primaryActionItem: {
          id: 'save',
          label: 'Save',
          run: jest.fn(),
          iconType: 'save',
        },
      };

      render(<AppMenuComponent config={configWithPrimary} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should render overflow button at a medium application breakpoint', () => {
      mockCurrentBreakpoint = 's';

      render(<AppMenuComponent config={defaultConfig} />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).toBeInTheDocument();
    });

    it('should render overflow button with all items at a narrow application breakpoint', () => {
      mockCurrentBreakpoint = 'xs';

      render(<AppMenuComponent config={defaultConfig} />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).toBeInTheDocument();
    });

    it('should render individual menu items at m/l/xl application breakpoints', () => {
      for (const breakpoint of ['m', 'l', 'xl'] as const) {
        mockCurrentBreakpoint = breakpoint;

        const { unmount } = render(<AppMenuComponent config={defaultConfig} />);

        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();

        unmount();
      }
    });

    it('should fall back to viewport breakpoints when application measurement is unavailable', () => {
      mockCurrentBreakpoint = undefined;
      mockViewportBreakpoint = 'm';

      render(<AppMenuComponent config={defaultConfig} />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('should use viewport xl as wide when application measurement is unavailable', () => {
      mockCurrentBreakpoint = undefined;
      mockViewportBreakpoint = 'xl';

      render(<AppMenuComponent config={defaultConfig} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should render overflow button at the wide breakpoint when item is marked as overflow', () => {
      const forcedOverflowItem: AppMenuItemType = {
        id: 'singleOverflowItem',
        label: 'Single overflow item',
        run: jest.fn(),
        iconType: 'gear',
        order: 1,
        overflow: true,
      };
      const forcedOverflowConfig: AppMenuConfig = {
        items: [forcedOverflowItem],
      };

      render(<AppMenuComponent config={forcedOverflowConfig} />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).toBeInTheDocument();
      expect(screen.queryByText('Single overflow item')).not.toBeInTheDocument();
    });
  });

  describe('viewport breakpoint mapping', () => {
    it('should render collapsed content at viewport s', () => {
      mockViewportBreakpoint = 's';

      render(<AppMenuComponent config={defaultConfig} breakpointSource="viewport" />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('should render medium content at viewport m and l', () => {
      for (const breakpoint of ['m', 'l'] as const) {
        mockViewportBreakpoint = breakpoint;

        const { unmount } = render(
          <AppMenuComponent config={defaultConfig} breakpointSource="viewport" />
        );

        expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).toBeInTheDocument();
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

        unmount();
      }
    });

    it('should render wide content at viewport xl', () => {
      mockViewportBreakpoint = 'xl';

      render(<AppMenuComponent config={defaultConfig} breakpointSource="viewport" />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('switch', () => {
    const switchConfig: AppMenuConfig['switch'] = {
      id: 'test-switch',
      label: 'Test switch',
      labelProps: {},
      checked: false,
      onChange: jest.fn(),
      'data-test-subj': 'test-switch',
    };

    it('should render the app menu with only a switch (standalone)', () => {
      render(<AppMenuComponent config={{ switch: switchConfig }} />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.root)).toBeInTheDocument();
      expect(screen.getByTestId('test-switch')).toBeInTheDocument();
    });

    it('should render the switch alongside menu items at the wide application breakpoint', () => {
      render(<AppMenuComponent config={{ ...defaultConfig, switch: switchConfig }} />);

      expect(screen.getByTestId('test-switch')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should render the switch at a medium application breakpoint', () => {
      mockCurrentBreakpoint = 's';

      render(<AppMenuComponent config={{ ...defaultConfig, switch: switchConfig }} />);

      expect(screen.getByTestId('test-switch')).toBeInTheDocument();
    });

    it('should not render standalone switch at a narrow application breakpoint', () => {
      mockCurrentBreakpoint = 'xs';

      render(<AppMenuComponent config={{ switch: switchConfig }} />);

      expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.overflowButton)).toBeInTheDocument();
      expect(screen.queryByTestId('test-switch')).not.toBeInTheDocument();
    });

    it('should not wrap the switch in a tooltip when no tooltip is provided', () => {
      render(<AppMenuComponent config={{ switch: switchConfig }} />);

      expect(
        screen.getByTestId('test-switch').closest('.euiToolTipAnchor')
      ).not.toBeInTheDocument();
    });

    it('should wrap the switch in a tooltip when tooltipContent is provided', () => {
      render(
        <AppMenuComponent
          config={{ switch: { ...switchConfig, tooltipContent: 'Save changes to enable' } }}
        />
      );

      expect(screen.getByTestId('test-switch').closest('.euiToolTipAnchor')).toBeInTheDocument();
    });

    it('should wrap the switch in a tooltip when tooltipTitle is provided', () => {
      render(
        <AppMenuComponent config={{ switch: { ...switchConfig, tooltipTitle: 'Disabled' } }} />
      );

      expect(screen.getByTestId('test-switch').closest('.euiToolTipAnchor')).toBeInTheDocument();
    });
  });
});
