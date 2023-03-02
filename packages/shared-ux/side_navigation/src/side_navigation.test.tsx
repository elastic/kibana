/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { SideNavigation, type SideNavigationProps } from './side_navigation';
import type { SideNavItem } from './types';
import { METRIC_TYPE } from '@kbn/analytics';
import { TELEMETRY_EVENT } from './telemetry/const';

const mockTrack = jest.fn();

const mockItems: SideNavItem[] = [
  {
    id: 'dashboardsLanding',
    label: 'Dashboards',
    href: '/dashboards',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        href: '/overview',
        description: 'Overview description',
      },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    href: '/alerts',
  },
];

const renderNav = (props: Partial<SideNavigationProps> = {}) =>
  render(<SideNavigation items={mockItems} selectedId={'alerts'} tracker={mockTrack} {...props} />);

describe('SideNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all main items', () => {
    const result = renderNav();
    expect(result.getByText('Dashboards')).toBeInTheDocument();
    expect(result.getByText('Alerts')).toBeInTheDocument();
  });

  describe('links', () => {
    it('should contain correct href in links', () => {
      const result = renderNav();
      expect(
        result.getByTestId(`groupedNavItemLink-${'dashboardsLanding'}`).getAttribute('href')
      ).toBe('/dashboards');
      expect(result.getByTestId(`groupedNavItemLink-${'alerts'}`).getAttribute('href')).toBe(
        '/alerts'
      );
    });

    it('should call onClick callback if link clicked', () => {
      const mockOnClick = jest.fn((ev) => {
        ev.preventDefault();
      });
      const items = [
        ...mockItems,
        {
          id: 'exploreLanding',
          label: 'Explore',
          href: '/explore',
          onClick: mockOnClick,
        },
      ];
      const result = renderNav({ items });
      result.getByTestId(`groupedNavItemLink-${'exploreLanding'}`).click();
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should send telemetry if link clicked', () => {
      const items = [
        ...mockItems,
        {
          id: 'exploreLanding',
          label: 'Explore',
          href: '/explore',
        },
      ];
      const result = renderNav({ items });
      result.getByTestId(`groupedNavItemLink-${'exploreLanding'}`).click();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.NAVIGATION}${'exploreLanding'}`
      );
    });
  });

  describe('panel button toggle', () => {
    it('should render the group button only for grouped items', () => {
      const result = renderNav();
      expect(result.getByTestId(`groupedNavItemButton-${'dashboardsLanding'}`)).toBeInTheDocument();
      expect(result.queryByTestId(`groupedNavItemButton-${'alerts'}`)).not.toBeInTheDocument();
    });

    it('should render the group panel when button is clicked', () => {
      const result = renderNav();
      expect(result.queryByTestId('groupedNavPanel')).not.toBeInTheDocument();

      result.getByTestId(`groupedNavItemButton-${'dashboardsLanding'}`).click();
      expect(result.getByTestId('groupedNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();
    });

    it('should telemetry when button is clicked', () => {
      const result = renderNav();
      expect(result.queryByTestId('groupedNavPanel')).not.toBeInTheDocument();

      result.getByTestId(`groupedNavItemButton-${'dashboardsLanding'}`).click();
      expect(mockTrack).toHaveBeenCalledWith(
        METRIC_TYPE.CLICK,
        `${TELEMETRY_EVENT.GROUPED_NAVIGATION_TOGGLE}${'dashboardsLanding'}`
      );
    });

    it('should close the group panel when the same button is clicked', () => {
      const result = renderNav();
      result.getByTestId(`groupedNavItemButton-${'dashboardsLanding'}`).click();
      expect(result.getByTestId('groupedNavPanel')).toBeInTheDocument();

      result.getByTestId(`groupedNavItemButton-${'dashboardsLanding'}`).click();

      waitFor(() => {
        expect(result.queryByTestId('groupedNavPanel')).not.toBeInTheDocument();
      });
    });

    it('should open other group panel when other button is clicked while open', () => {
      const items = [
        ...mockItems,
        {
          id: 'exploreLanding',
          label: 'Explore',
          href: '/explore',
          items: [
            {
              id: 'users',
              label: 'Users',
              href: '/users',
              description: 'Users description',
            },
          ],
        },
      ];
      const result = renderNav({ items });

      result.getByTestId(`groupedNavItemButton-${'dashboardsLanding'}`).click();
      expect(result.getByTestId('groupedNavPanel')).toBeInTheDocument();
      expect(result.getByText('Overview')).toBeInTheDocument();

      result.getByTestId(`groupedNavItemButton-${'exploreLanding'}`).click();
      expect(result.queryByTestId('groupedNavPanel')).toBeInTheDocument();
      expect(result.getByText('Users')).toBeInTheDocument();
    });
  });
});
