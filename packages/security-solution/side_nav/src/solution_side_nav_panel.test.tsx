/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
<<<<<<<< HEAD:packages/shared-ux/side_navigation/src/solution_grouped_nav_panel.test.tsx
import { SideNavigationPanel, type SideNavigationPanelProps } from './side_navigation_panel';
import type { DefaultSideNavItem } from './types';
========
import { SolutionSideNavPanel, type SolutionSideNavPanelProps } from './solution_side_nav_panel';
import type { SolutionSideNavItem } from './types';
>>>>>>>> clintandrewhall/serverless/poc/navigation:packages/security-solution/side_nav/src/solution_side_nav_panel.test.tsx
import { BETA_LABEL } from './beta_badge';
import { TELEMETRY_EVENT } from './telemetry/const';
import { METRIC_TYPE } from '@kbn/analytics';
import { TelemetryContextProvider } from './telemetry/telemetry_context';
import type { LinkCategories } from './types';

const mockUseIsWithinMinBreakpoint = jest.fn(() => true);
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinMinBreakpoint: () => mockUseIsWithinMinBreakpoint(),
  };
});

const mockTrack = jest.fn();

const mockItems: SolutionSideNavItem[] = [
  {
    id: 'hosts',
    label: 'Hosts',
    href: '/hosts',
    description: 'Hosts description',
  },
  {
    id: 'network',
    label: 'Network',
    href: '/network',
    description: 'Network description',
  },
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    href: '/kubernetes',
    description: 'Kubernetes description',
    isBeta: true,
  },
];

const betaMockItemsCount = mockItems.filter((item) => item.isBeta).length;

const mockCategories: LinkCategories = [
  {
    label: 'HOSTS CATEGORY',
    linkIds: ['hosts'],
  },
  {
    label: 'Empty category',
    linkIds: [],
  },
];

const bottomNavOffset = '10px';
const PANEL_TITLE = 'test title';
const mockOnClose = jest.fn();
const mockOnOutsideClick = jest.fn();
<<<<<<<< HEAD:packages/shared-ux/side_navigation/src/solution_grouped_nav_panel.test.tsx
const renderNavPanel = (props: Partial<SideNavigationPanelProps> = {}) =>
========
const renderNavPanel = (props: Partial<SolutionSideNavPanelProps> = {}) =>
>>>>>>>> clintandrewhall/serverless/poc/navigation:packages/security-solution/side_nav/src/solution_side_nav_panel.test.tsx
  render(
    <>
      <div data-test-subj="outsideClickDummy" />
      <TelemetryContextProvider tracker={mockTrack}>
<<<<<<<< HEAD:packages/shared-ux/side_navigation/src/solution_grouped_nav_panel.test.tsx
        <SideNavigationPanel
========
        <SolutionSideNavPanel
>>>>>>>> clintandrewhall/serverless/poc/navigation:packages/security-solution/side_nav/src/solution_side_nav_panel.test.tsx
          items={mockItems}
          title={PANEL_TITLE}
          onClose={mockOnClose}
          onOutsideClick={mockOnOutsideClick}
          {...props}
        />
      </TelemetryContextProvider>
    </>
  );

describe('SolutionSideNavPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all main items', () => {
    const result = renderNavPanel();

    expect(result.getByText(PANEL_TITLE)).toBeInTheDocument();

    mockItems.forEach((item) => {
      expect(result.getByText(item.label)).toBeInTheDocument();
      if (item.description) {
        expect(result.getByText(item.description)).toBeInTheDocument();
      }
    });
    expect(result.queryAllByText(BETA_LABEL).length).toBe(betaMockItemsCount);
  });

  it('should only render categories with items', () => {
    const result = renderNavPanel({ categories: mockCategories });

    mockCategories.forEach((mockCategory) => {
      if (mockCategory.linkIds.length) {
        expect(result.getByText(mockCategory.label)).toBeInTheDocument();
      } else {
        expect(result.queryByText(mockCategory.label)).not.toBeInTheDocument();
      }
    });
  });

  describe('links', () => {
    it('should contain correct href in links', () => {
      const result = renderNavPanel();
<<<<<<<< HEAD:packages/shared-ux/side_navigation/src/solution_grouped_nav_panel.test.tsx
      expect(result.getByTestId(`groupedNavPanelLink-${'hosts'}`).getAttribute('href')).toBe(
        '/hosts'
      );
      expect(result.getByTestId(`groupedNavPanelLink-${'network'}`).getAttribute('href')).toBe(
========
      expect(result.getByTestId(`solutionSideNavPanelLink-${'hosts'}`).getAttribute('href')).toBe(
        '/hosts'
      );
      expect(result.getByTestId(`solutionSideNavPanelLink-${'network'}`).getAttribute('href')).toBe(
>>>>>>>> clintandrewhall/serverless/poc/navigation:packages/security-solution/side_nav/src/solution_side_nav_panel.test.tsx
        '/network'
      );
    });

    it('should call onClick callback if link clicked', () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const items = [
        ...mockItems,
        {
          id: 'users',
          label: 'Users',
          href: '/users',
          onClick: mockOnClick,
        },
      ];
      const result = renderNavPanel({ items });
<<<<<<<< HEAD:packages/shared-ux/side_navigation/src/solution_grouped_nav_panel.test.tsx
      result.getByTestId(`groupedNavPanelLink-${'users'}`).click();
========
      result.getByTestId(`solutionSideNavPanelLink-${'users'}`).click();
>>>>>>>> clintandrewhall/serverless/poc/navigation:packages/security-solution/side_nav/src/solution_side_nav_panel.test.tsx
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should send telemetry if link clicked', () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const items = [
        ...mockItems,
        {
          id: 'users',
          label: 'Users',
          href: '/users',
          onClick: mockOnClick,
        },
      ];
      const result = renderNavPanel({ items });
<<<<<<<< HEAD:packages/shared-ux/side_navigation/src/solution_grouped_nav_panel.test.tsx
      result.getByTestId(`groupedNavPanelLink-${'users'}`).click();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.GROUPED_NAVIGATION}${'users'}`
========
      result.getByTestId(`solutionSideNavPanelLink-${'users'}`).click();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.PANEL_NAVIGATION}${'users'}`
>>>>>>>> clintandrewhall/serverless/poc/navigation:packages/security-solution/side_nav/src/solution_side_nav_panel.test.tsx
      );
    });
  });

  describe('bottom offset', () => {
    it('should add bottom offset', () => {
      mockUseIsWithinMinBreakpoint.mockReturnValueOnce(true);
      const result = renderNavPanel({ bottomOffset: bottomNavOffset });

      expect(result.getByTestId('solutionSideNavPanel')).toHaveStyle({ bottom: bottomNavOffset });
    });

    it('should not add bottom offset if not large screen', () => {
      mockUseIsWithinMinBreakpoint.mockReturnValueOnce(false);
      const result = renderNavPanel({ bottomOffset: bottomNavOffset });

      expect(result.getByTestId('solutionSideNavPanel')).not.toHaveStyle({
        bottom: bottomNavOffset,
      });
    });
  });

  describe('close', () => {
    it('should call onClose callback if link clicked', () => {
      const result = renderNavPanel();
<<<<<<<< HEAD:packages/shared-ux/side_navigation/src/solution_grouped_nav_panel.test.tsx
      result.getByTestId(`groupedNavPanelLink-${'hosts'}`).click();
========
      result.getByTestId(`solutionSideNavPanelLink-${'hosts'}`).click();
>>>>>>>> clintandrewhall/serverless/poc/navigation:packages/security-solution/side_nav/src/solution_side_nav_panel.test.tsx
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose callback if outside clicked', () => {
      const result = renderNavPanel();
      result.getByTestId('outsideClickDummy').click();
      waitFor(() => {
        expect(mockOnOutsideClick).toHaveBeenCalled();
      });
    });
  });
});
