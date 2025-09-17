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

import { COLLAPSED_MENU_GAP, COLLAPSED_MENU_ITEM_HEIGHT, MAX_MENU_ITEMS } from '../constants';
import { Navigation } from '../components/navigation';
import { basicMock } from '../mocks/basic_navigation';
import { createBoundingClientRectMock } from './create_bounding_client_rect_mock';
import { observabilityMock } from '../mocks/observability';
import { securityMock } from '../mocks/security';

// Security mock reusable IDs - Machine Learning > Anomaly explorer (item that's in "More" menu)
const mlAnomalyExplorerItemId = securityMock.navItems.primaryItems[11].sections?.[1].items[0].id;

describe('Collapsed mode', () => {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  beforeAll(() => {
    Element.prototype.getBoundingClientRect = createBoundingClientRectMock(
      (COLLAPSED_MENU_ITEM_HEIGHT + COLLAPSED_MENU_GAP) * (MAX_MENU_ITEMS - 1) +
        (COLLAPSED_MENU_ITEM_HEIGHT + COLLAPSED_MENU_GAP)
    );
  });

  afterAll(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('should render the side navigation', () => {
    const { container } = render(
      <Navigation
        isCollapsed
        items={basicMock.navItems}
        logo={basicMock.logo}
        setWidth={() => {}}
      />
    );

    expect(container).toMatchSnapshot();
  });

  describe('Solution logo', () => {
    /**
     * GIVEN the side navigation is in collapsed mode
     * WHEN the navigation renders the solution logo
     * THEN I should not see the solution label
     */
    it('should NOT display the solution label next to the logo', () => {
      render(
        <Navigation
          isCollapsed
          items={basicMock.navItems}
          logo={basicMock.logo}
          setWidth={() => {}}
        />
      );

      const solutionLogo = screen.getByRole('link', {
        name: 'Solution homepage',
      });

      // The label is wrapped with `<EuiScreenReaderOnly />` in collapsed mode
      // See: https://eui.elastic.co/docs/utilities/accessibility/#screen-reader-only
      expect(solutionLogo.children[1].className).toContain('euiScreenReaderOnly');
    });

    /**
     * GIVEN the side navigation is in collapsed mode
     * WHEN I hover over the solution logo
     * THEN a tooltip appears with the item label
     * AND when I click on the trigger
     * AND then I hover out
     * THEN the tooltip disappears
     */
    it('should display a tooltip with the solution label on hover, and hide on hover out', async () => {
      render(
        <Navigation
          isCollapsed
          items={basicMock.navItems}
          logo={basicMock.logo}
          setWidth={() => {}}
        />
      );

      const solutionLogo = screen.getByRole('link', {
        name: 'Solution homepage',
      });

      await userEvent.hover(solutionLogo);

      const tooltip = await screen.findByRole('tooltip', {
        name: 'Solution',
      });

      expect(tooltip).toBeInTheDocument();

      await userEvent.click(solutionLogo);
      await userEvent.unhover(solutionLogo);

      // Even after clicking on the trigger which makes the `EuiToolTip` persistent by default
      // See: https://eui.elastic.co/docs/components/display/tooltip/
      await waitFor(() => {
        expect(tooltip).not.toBeInTheDocument();
      });
    });
  });

  describe('Primary menu', () => {
    describe('Primary menu item', () => {
      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I hover over it
       * THEN I should see a popover with the submenu
       */
      it('(with submenu) should show a popover with the submenu on hover', async () => {
        render(
          <Navigation
            isCollapsed
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
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item with a submenu receives keyboard focus
       * THEN I should see a popover with the submenu
       */
      it('(with submenu) should show a popover when item with submenu receives keyboard focus', async () => {
        render(
          <Navigation
            isCollapsed
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        appsLink.focus();

        const popover = await screen.findByRole('dialog', {
          name: 'Apps',
        });

        expect(popover).toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item has a submenu (has children)
       * WHEN I click on it
       * - THEN I should be redirected to its href
       * AND I should not see a side panel
       */
      it('(with submenu) should redirect and NOT open side panel when clicking item', async () => {
        render(
          <Navigation
            isCollapsed
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });
        const expectedHref = basicMock.navItems.primaryItems[2].href; // Apps

        await userEvent.click(appsLink);

        expect(appsLink).toHaveAttribute('href', expectedHref);

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item with a submenu has focus
       * WHEN I press the Enter key
       * THEN focus moves to the first item inside the displayed popover
       */
      it('(with submenu) should move focus to first popover item on Enter', async () => {
        render(
          <Navigation
            isCollapsed
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
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I hover over it
       * THEN I should not see a popover
       */
      it('(without submenu) should NOT show a popover on hover', async () => {
        render(
          <Navigation
            isCollapsed
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
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item doesn’t have a submenu
       * WHEN I click on it
       * - THEN I should be redirected to its href
       * AND I should not see a side panel
       */
      it('(without submenu) should redirect without side panel when clicking item without submenu', async () => {
        render(
          <Navigation
            isCollapsed
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });
        const expectedHref = basicMock.navItems.primaryItems[0].href;

        await userEvent.click(dashboardsLink);

        expect(dashboardsLink).toHaveAttribute('href', expectedHref);

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item without a submenu has focus
       * WHEN I press the Enter key
       * - THEN I should be redirected to its href
       */
      it('(without submenu) should redirect on Enter when focused item has no submenu', async () => {
        render(
          <Navigation
            isCollapsed
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });
        const expectedHref = basicMock.navItems.primaryItems[0].href;

        dashboardsLink.focus();

        await userEvent.keyboard('{enter}');

        expect(dashboardsLink).toHaveAttribute('href', expectedHref);
      });

      /**
       * GIVEN the side navigation is in collapsed mode
       * WHEN I hover over a primary menu item
       * THEN a tooltip appears with the item label
       * AND when I click on the trigger
       * AND then I hover out
       * THEN the tooltip disappears
       */
      it('should display a tooltip with the item label on hover, and hide on hover out', async () => {
        render(
          <Navigation
            isCollapsed
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });

        await userEvent.hover(dashboardsLink);

        const tooltip = await screen.findByRole('tooltip', {
          name: 'Dashboards',
        });

        expect(tooltip).toBeInTheDocument();

        await userEvent.click(dashboardsLink);
        await userEvent.unhover(dashboardsLink);

        // Even after clicking on the trigger which makes the `EuiToolTip` persistent by default
        // See: https://eui.elastic.co/docs/components/display/tooltip/
        await waitFor(() => {
          expect(tooltip).not.toBeInTheDocument();
        });
      });

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item is in beta
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with beta icon
       */
      it('should show tooltip with label and beta badge on hover', async () => {
        render(
          <Navigation
            isCollapsed
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
        expect(tooltip).toHaveTextContent('Dashboards');
        expect(betaIcon).toBeInTheDocument();
      });

      /**
       * GIVEN the side navigation is in collapsed mode
       * AND a primary menu item is in tech preview
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with flask icon
       */
      it('should show tooltip with label and flask badge on hover', async () => {
        render(
          <Navigation
            isCollapsed
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
        expect(tooltip).toHaveTextContent('Cases');
        expect(flaskIcon).toBeInTheDocument();
      });
    });

    describe('More menu', () => {
      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN the navigation renders
       * THEN I should see a "More" primary menu item
       */
      it('should render the "More" primary menu item when items overflow', () => {
        // Renders 10 primary menu items + "More" item
        render(
          <I18nProvider>
            <Navigation
              isCollapsed
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        expect(moreButton).toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN I hover over the "More" primary menu item
       * THEN I should see a popover with secondary menu
       */
      it('should show secondary menu popover on hover over "More"', async () => {
        render(
          <I18nProvider>
            <Navigation
              isCollapsed
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

        expect(popover).toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the arrow next to the item that has a submenu
       * THEN the nested panel shows with the submenu
       * AND when I click on a submenu item
       * THEN the popover should close
       * - AND I should be redirected to that item’s href
       * AND I shouldn’t see a side panel
       */
      it('should navigate through nested panel and redirect on clicking a submenu item', async () => {
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = React.useState<string | undefined>();

          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed
                items={securityMock.navItems}
                logo={securityMock.logo}
                onItemClick={(item) => {
                  if ('id' in item) {
                    setActiveItemId(item.id);
                  }
                }}
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

        expect(popover).toBeInTheDocument();

        const mlAnomalyExplorerLink = await within(popover).findByRole('link', {
          name: 'Anomaly explorer',
        });

        expect(mlAnomalyExplorerLink).toBeInTheDocument();

        await userEvent.click(mlAnomalyExplorerLink);

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * WHEN I hover over the "More" primary menu item
       * AND I click on the menu item that doesn’t have a submenu
       * THEN the popover should close
       * - AND I should be redirected to that item’s href
       * AND I shouldn’t see a side panel
       */
      it('should close popover, redirect, and NOT open side panel after clicking on an item without submenu from "More"', async () => {
        render(
          <I18nProvider>
            <Navigation
              isCollapsed
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

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).not.toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the navigation renders in collapsed mode
       * AND the initial active item is a submenu item of an item in the "More" menu
       * WHEN the navigation renders in collapsed mode
       * THEN the "More" primary menu item itself is in an active state
       * AND its parent primary menu item is active within the "More" menu popover
       * AND there is no side panel
       * AND the submenu item is active in its nested panel within the popover
       */
      it('should have active state and NOT open side panel when initial active submenu item is under "More"', async () => {
        render(
          <I18nProvider>
            <Navigation
              activeItemId={mlAnomalyExplorerItemId}
              isCollapsed
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

        const mlLink = within(popover).getByRole('link', {
          name: 'Machine learning',
        });

        // Parent should be highlighted when child is active
        expect(mlLink).toHaveAttribute('data-highlighted', 'true');

        await userEvent.click(mlLink);

        const mlAnomalyExplorerLink = within(popover).getByRole('link', {
          name: 'Anomaly explorer',
        });

        // Actual active submenu item should be both current and highlighted
        expect(mlAnomalyExplorerLink).toHaveAttribute('aria-current', 'page');
        expect(mlAnomalyExplorerLink).toHaveAttribute('data-highlighted', 'true');

        const sidePanel = screen.queryByRole('region', {
          name: 'Side panel',
        });

        expect(sidePanel).not.toBeInTheDocument();
      });
    });
  });
});
