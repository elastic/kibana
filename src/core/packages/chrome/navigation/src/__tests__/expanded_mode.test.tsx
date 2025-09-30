/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { TestComponent } from './test_component';
import { basicMock } from '../mocks/basic_navigation';
import { observabilityMock } from '../mocks/observability';
import { securityMock } from '../mocks/security';
import { mockClientHeight } from './mock_client_height';

const mockExpandedMenuGap = 16;
const mockMenuItemHeight = 51;

// Basic mock reusable IDs
const appsItemId = basicMock.navItems.primaryItems[2].id;

// Security mock reusable IDs
const resultExplorerItemId = securityMock.navItems.primaryItems[11].sections?.[2].items[0].id;

describe('Expanded mode', () => {
  beforeAll(() => {
    // Mock the client height for the primary menu item
    mockClientHeight(mockMenuItemHeight);
    // Mock the gap between the primary menu items
    jest.mock('../utils/get_style_property', () => ({
      getStyleProperty: jest.fn(() => mockExpandedMenuGap),
    }));
  });

  it('should render the side navigation', () => {
    const { container } = render(
      <TestComponent isCollapsed={false} items={basicMock.navItems} logo={basicMock.logo} />
    );

    expect(container).toMatchSnapshot();
  });

  describe('Solution logo', () => {
    /**
     * GIVEN the side navigation is in expanded mode
     * WHEN the navigation renders the solution logo
     * THEN I should see the solution label
     */
    it('should display the solution label next to the logo', () => {
      render(
        <TestComponent isCollapsed={false} items={basicMock.navItems} logo={basicMock.logo} />
      );

      const solutionLogo = screen.getByRole('link', {
        name: 'Solution homepage',
      });

      // The label is NOT wrapped with `<EuiScreenReaderOnly />` in expanded mode
      // See: https://eui.elastic.co/docs/utilities/accessibility/#screen-reader-only
      expect(solutionLogo.children[1].className).not.toContain('euiScreenReaderOnly');
    });
  });

  describe('Primary menu', () => {
    describe('Primary menu item', () => {
      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I hover over it
       * THEN I should see a popover with the submenu
       */
      it('(with submenu) should show a popover with the submenu on hover (with submenu)', async () => {
        render(
          <TestComponent isCollapsed={false} items={basicMock.navItems} logo={basicMock.logo} />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        await userEvent.hover(appsLink);

        const popover = await screen.findByRole('dialog', {
          name: 'Apps',
        });

        expect(popover).toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item with a submenu is in an active state
       * WHEN I hover over it
       * THEN a popover with the submenu should not be displayed
       */
      it('(with submenu) should NOT show a popover if the item with submenu is already active', async () => {
        render(
          <TestComponent
            logo={basicMock.logo}
            items={basicMock.navItems}
            isCollapsed={false}
            initialActiveItemId={appsItemId}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        expect(appsLink).toHaveAttribute('aria-current', 'page');
        expect(appsLink).toHaveAttribute('data-highlighted', 'true');

        await userEvent.hover(appsLink);

        const popover = screen.queryByRole('dialog', {
          name: 'Apps',
        });

        expect(popover).not.toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I click on it
       * THEN I should be redirected to its href
       * AND a side panel with the submenu should show
       */
      it('(with submenu) should redirect and open side panel when clicking item with submenu', async () => {
        render(
          <TestComponent
            initialActiveItemId={appsItemId}
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });
        const expectedHref = basicMock.navItems.primaryItems[2].href;

        expect(appsLink).toHaveAttribute('href', expectedHref);

        await userEvent.click(appsLink);

        const sidePanel = await screen.findByRole('region', {
          name: 'Side panel for Apps',
        });

        expect(sidePanel).toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item with a submenu has focus
       * WHEN I press the Enter key
       * THEN focus should move to the popover
       */
      it('(with submenu) should move focus to popover on Enter when focused item has submenu', async () => {
        render(
          <TestComponent isCollapsed={false} items={basicMock.navItems} logo={basicMock.logo} />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        act(() => {
          appsLink.focus();
        });

        await userEvent.keyboard('{enter}');

        const popover = await screen.findByRole('dialog', {
          name: 'Apps',
        });

        const overviewLink = within(popover).getByRole('link', {
          name: 'Overview',
        });

        expect(overviewLink).toHaveFocus();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I hover over it
       * THEN I should not see a popover
       */
      it('(without submenu) should NOT show a popover on hover (without submenu)', async () => {
        render(
          <TestComponent isCollapsed={false} items={basicMock.navItems} logo={basicMock.logo} />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });

        await userEvent.hover(dashboardsLink);

        const popover = screen.queryByRole('dialog');

        expect(popover).not.toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I click on it
       * THEN I should be redirected to its href
       * AND I should not see a side panel
       */
      it('(without submenu) should redirect and NOT open side panel when clicking item without submenu', async () => {
        render(
          <TestComponent isCollapsed={false} items={basicMock.navItems} logo={basicMock.logo} />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });
        const expectedHref = basicMock.navItems.primaryItems[0].href;

        expect(dashboardsLink).toHaveAttribute('href', expectedHref);

        await userEvent.click(dashboardsLink);

        const sidePanel = screen.queryByRole('region', {
          name: /Side panel/,
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item without a submenu has focus
       * WHEN I press the Enter key
       * THEN I should be redirected to its href
       */
      it('(without submenu) should redirect on Enter when focused item has no submenu', async () => {
        render(
          <TestComponent isCollapsed={false} items={basicMock.navItems} logo={basicMock.logo} />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });
        const expectedHref = basicMock.navItems.primaryItems[0].href;

        expect(dashboardsLink).toHaveAttribute('href', expectedHref);

        act(() => {
          dashboardsLink.focus();
        });

        await userEvent.keyboard('{enter}');

        const sidePanel = screen.queryByRole('region', {
          name: /Side panel/,
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item is in beta
       * WHEN I hover over that item
       * THEN a tooltip shows up with "Beta" text
       * AND a beta badge with beta icon
       */
      it('should show tooltip with "Beta" and beta badge on hover', async () => {
        render(
          <TestComponent
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
          />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });

        await userEvent.hover(dashboardsLink);

        const tooltip = await screen.findByRole('tooltip');
        const betaIcon = tooltip.querySelector('[data-euiicon-type="beta"]');

        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent('Beta');
        expect(betaIcon).toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in expanded mode
       * AND a primary menu item is in tech preview
       * WHEN I hover over that item
       * THEN a tooltip shows up with "Tech preview" text
       * AND a beta badge with flask icon
       */
      it('should show tooltip with "Tech preview" and flask badge on hover', async () => {
        render(
          <TestComponent
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
          />
        );

        const casesLink = screen.getByRole('link', {
          name: 'Cases',
        });

        await userEvent.hover(casesLink);

        const tooltip = await screen.findByRole('tooltip');
        const flaskIcon = tooltip.querySelector('[data-euiicon-type="flask"]');

        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent('Tech preview');
        expect(flaskIcon).toBeInTheDocument();
      });
    });

    describe('More menu', () => {
      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN the navigation renders
       * THEN I should see a "More" primary menu item
       */
      it('should render the "More" primary menu item when items overflow', async () => {
        render(
          <TestComponent
            isCollapsed={false}
            items={securityMock.navItems}
            logo={securityMock.logo}
          />
        );

        const moreButton = await screen.findByRole('button', {
          name: 'More',
        });

        expect(moreButton).toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * THEN I should see a popover with secondary menu
       */
      it('should show popover with secondary menu on hover over "More"', async () => {
        render(
          <TestComponent
            isCollapsed={false}
            items={securityMock.navItems}
            logo={securityMock.logo}
          />
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        await userEvent.hover(moreButton);

        const popover = await screen.findByRole('dialog', {
          name: 'More',
        });

        await within(popover).findAllByRole('link');

        expect(popover).toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the “More” primary menu item
       * AND I click on the menu item that has a submenu
       * THEN the nested panel shows with the submenu
       * AND when I click on a submenu item
       * THEN the popover should close
       * - AND I should be redirected to that item’s href
       * AND I should see a side panel with that submenu
       */
      // TODO: fix; fails in CI
      it.skip('should open side panel when clicking submenu item inside "More" popover', async () => {
        render(
          <TestComponent
            isCollapsed={false}
            items={securityMock.navItems}
            logo={securityMock.logo}
          />
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        await userEvent.hover(moreButton);

        const popover = await screen.findByRole('dialog', {
          name: 'More',
        });

        const mlButton = within(popover).getByRole('button', {
          name: 'Machine learning',
        });

        await userEvent.click(mlButton);

        expect(popover).toBeInTheDocument();

        const mlHeading = await within(popover).findByRole('heading', {
          name: 'Machine learning',
        });

        expect(mlHeading).toBeInTheDocument();

        let anomalyExplorerLink = await within(popover).findByRole('link', {
          name: 'Anomaly explorer',
        });

        await userEvent.click(anomalyExplorerLink);

        const sidePanel = await screen.findByRole('region', {
          name: 'Side panel for Machine learning',
        });

        expect(sidePanel).toBeInTheDocument();

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        expect(sidePanel).toBeInTheDocument();

        anomalyExplorerLink = await within(sidePanel).findByRole('link', {
          name: 'Anomaly explorer',
        });

        expect(anomalyExplorerLink).toBeInTheDocument();
        expect(anomalyExplorerLink).toHaveAttribute('data-highlighted', 'true');
        expect(anomalyExplorerLink).toHaveAttribute('aria-current', 'page');
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that doesn’t have a submenu
       * THEN I shouldn’t see a side panel
       * AND I should be redirected to that item’s href
       */
      it('should NOT open side panel when clicking item without submenu in "More" popover', async () => {
        render(
          <TestComponent
            isCollapsed={false}
            items={securityMock.navItems}
            logo={securityMock.logo}
          />
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        await userEvent.hover(moreButton);

        const popover = await screen.findByRole('dialog', {
          name: 'More',
        });

        const coverageLink = within(popover).getByRole('link', {
          name: 'Coverage',
        });

        await userEvent.click(coverageLink);

        const sidePanel = screen.queryByRole('region', {
          name: /Side panel/,
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN the navigation renders in expanded mode
       * AND not all primary menu items fit the menu height
       * AND the initial active item is a submenu item of an item in the "More" menu
       * WHEN the navigation renders
       * THEN the "More" primary menu item itself is in an active state
       * AND its parent primary menu item is active within the "More" menu popover
       * AND a side panel with the submenu opens
       * AND the submenu item is in an active state
       */
      it('should have active state and open side panel when initial active submenu item is under "More"', async () => {
        render(
          <TestComponent
            initialActiveItemId={resultExplorerItemId}
            isCollapsed={false}
            items={securityMock.navItems}
            logo={securityMock.logo}
          />
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        expect(moreButton).toHaveAttribute('data-highlighted', 'true');

        await userEvent.hover(moreButton);

        const popover = await screen.findByRole('dialog', {
          name: 'More',
        });

        expect(popover).toBeInTheDocument();

        const mlButton = await within(popover).findByRole('button', {
          name: 'Machine learning',
        });

        expect(mlButton).toHaveAttribute('data-highlighted', 'true');

        await userEvent.click(mlButton);

        const mlHeader = await within(popover).findByText('Machine learning');

        expect(mlHeader).toBeInTheDocument();

        const resultExplorerLink = await within(popover).findByRole('link', {
          name: 'Result explorer',
        });

        const expectedSubItemHref =
          securityMock.navItems.primaryItems[11].sections?.[2].items[0].href;

        expect(resultExplorerLink).toHaveAttribute('href', expectedSubItemHref);
        expect(resultExplorerLink).toHaveAttribute('aria-current', 'page');
        expect(resultExplorerLink).toHaveAttribute('data-highlighted', 'true');
      });
    });
  });
});
