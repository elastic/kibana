/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { EXPANDED_MENU_GAP, EXPANDED_MENU_ITEM_HEIGHT, MAX_MENU_ITEMS } from '../constants';
import { Navigation } from '../components/navigation';
import { basicMock } from '../mocks/basic_navigation';
import { createBoundingClientRectMock } from './create_bounding_client_rect_mock';
import { observabilityMock } from '../mocks/observability';
import { resizeWindow } from './resize_window';
import { securityMock } from '../mocks/security';

// Basic mock reusable IDs
const appsItemId = basicMock.navItems.primaryItems[2].id;

// Security mock reusable IDs
const resultExplorerItemId = securityMock.navItems.primaryItems[11].sections?.[2].items[0].id;

describe('Expanded mode', () => {
  let restoreWindowSize: () => void;

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  const scrollIntoViewMock = jest.fn();

  beforeAll(() => {
    Element.prototype.getBoundingClientRect = createBoundingClientRectMock(
      (EXPANDED_MENU_ITEM_HEIGHT + EXPANDED_MENU_GAP) * (MAX_MENU_ITEMS - 1) +
        (EXPANDED_MENU_ITEM_HEIGHT + EXPANDED_MENU_GAP)
    );
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  beforeEach(() => {
    restoreWindowSize = resizeWindow(1024, 768);
    scrollIntoViewMock.mockClear();
  });

  afterAll(() => {
    if (restoreWindowSize) restoreWindowSize();
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('should render the side navigation', () => {
    const { container } = render(
      <Navigation
        isCollapsed={false}
        items={basicMock.navItems}
        logo={basicMock.logo}
        setWidth={() => {}}
      />
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
        <Navigation
          isCollapsed={false}
          items={basicMock.navItems}
          logo={basicMock.logo}
          setWidth={() => {}}
        />
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
          <Navigation
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
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
          <Navigation
            activeItemId={appsItemId}
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
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
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = React.useState<string | undefined>();

          return (
            <Navigation
              activeItemId={activeItemId}
              isCollapsed={false}
              items={basicMock.navItems}
              logo={basicMock.logo}
              onItemClick={(item) => setActiveItemId(item.id)}
              setWidth={() => {}}
            />
          );
        };

        render(<TestComponent />);

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });
        const expectedHref = basicMock.navItems.primaryItems[2].href;

        expect(appsLink).toHaveAttribute('href', expectedHref);

        await userEvent.click(appsLink);

        const sidePanel = await screen.findByRole('region', {
          name: 'Side panel',
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
          <Navigation
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        appsLink.focus();

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
          <Navigation
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
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
          <Navigation
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });
        const expectedHref = basicMock.navItems.primaryItems[0].href;

        expect(dashboardsLink).toHaveAttribute('href', expectedHref);

        await userEvent.click(dashboardsLink);

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
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
          <Navigation
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });
        const expectedHref = basicMock.navItems.primaryItems[0].href;

        expect(dashboardsLink).toHaveAttribute('href', expectedHref);

        dashboardsLink.focus();

        await userEvent.keyboard('{enter}');

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
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
          <Navigation
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
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
          <Navigation
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
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
          <I18nProvider>
            <Navigation
              isCollapsed={false}
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
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
          <I18nProvider>
            <Navigation
              isCollapsed={false}
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
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
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that has a submenu
       * THEN I should see a side panel with that submenu
       */
      it('should open side panel when clicking submenu item inside "More" popover', async () => {
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = React.useState<string | undefined>();

          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed={false}
                items={securityMock.navItems}
                logo={securityMock.logo}
                onItemClick={(item) => setActiveItemId(item.id)}
                setWidth={() => {}}
              />
            </I18nProvider>
          );
        };

        render(<TestComponent />);

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        await userEvent.hover(moreButton);

        const popover = await screen.findByRole('dialog', {
          name: 'More',
        });

        const mlLink = within(popover).getByRole('link', {
          name: 'Machine learning',
        });

        await userEvent.click(mlLink);

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that doesn’t have a submenu
       * THEN I shouldn’t see a side panel
       */
      it('should NOT open side panel when clicking item without submenu in "More" popover', async () => {
        render(
          <I18nProvider>
            <Navigation
              isCollapsed={false}
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
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
          name: 'Side panel',
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that has a submenu
       * THEN the popover should close
       * AND I should be redirected to that item’s href
       * AND I should a side panel should show with that submenu
       */
      it('should close popover, redirect, and open side panel after clicking on an item with submenu from "More"', async () => {
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = React.useState<string | undefined>();

          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed={false}
                items={securityMock.navItems}
                logo={securityMock.logo}
                onItemClick={(item) => setActiveItemId(item.id)}
                setWidth={() => {}}
              />
            </I18nProvider>
          );
        };

        render(<TestComponent />);

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        await userEvent.hover(moreButton);

        const popover = await screen.findByRole('dialog', {
          name: 'More',
        });

        const mlLink = within(popover).getByRole('link', {
          name: /Machine learning/,
        });
        const expectedHref = securityMock.navItems.primaryItems[11].href;

        expect(mlLink).toHaveAttribute('href', expectedHref);

        await userEvent.click(mlLink);

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        const sidePanel = await screen.findByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in expanded mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that doesn’t have a submenu
       * THEN the popover should close
       * AND I should be redirected to that item’s href
       * AND I shouldn’t see a side panel
       */
      it('should close popover, redirect, and NOT open side panel after clicking on an item without submenu from "More"', async () => {
        render(
          <I18nProvider>
            <Navigation
              isCollapsed={false}
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
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
        const expectedHref = securityMock.navItems.primaryItems[12].href;

        expect(coverageLink).toHaveAttribute('href', expectedHref);

        await userEvent.click(coverageLink);

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
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
          <I18nProvider>
            <Navigation
              activeItemId={resultExplorerItemId}
              isCollapsed={false}
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        // More button should be highlighted when containing active item
        expect(moreButton).toHaveAttribute('data-highlighted', 'true');

        await userEvent.hover(moreButton);

        const popover = await screen.findByRole('dialog', {
          name: 'More',
        });

        expect(popover).toBeInTheDocument();

        const mlPopoverLink = await within(popover).findByRole('link', {
          name: /Machine learning/,
        });
        const expectedHref = securityMock.navItems.primaryItems[11].href;

        expect(mlPopoverLink).toHaveAttribute('href', expectedHref);
        // Parent should be highlighted when child is active, but not marked as current
        expect(mlPopoverLink).toHaveAttribute('data-highlighted', 'true');

        const sidePanel = await screen.findByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).toBeInTheDocument();

        const resultExplorerLink = within(sidePanel).getByRole('link', {
          name: /Result explorer/,
        });
        const expectedSubItemHref =
          securityMock.navItems.primaryItems[11].sections?.[2].items[0].href;

        expect(resultExplorerLink).toHaveAttribute('href', expectedSubItemHref);
        // Actual active submenu item should be both current and highlighted
        expect(resultExplorerLink).toHaveAttribute('aria-current', 'page');
        expect(resultExplorerLink).toHaveAttribute('data-highlighted', 'true');
      });
    });
  });
});
