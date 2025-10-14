/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, waitFor, within, act, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { TestComponent } from './test_component';
import { flushPopoverTimers } from './flush_popover_timers';
import { basicMock } from '../mocks/basic_navigation';
import { elasticsearchMock } from '../mocks/elasticsearch';
import { mockClientHeight } from './mock_client_height';
import { observabilityMock } from '../mocks/observability';
import { resizeWindow } from './resize_window';
import { securityMock } from '../mocks/security';

const mockMenuItemHeight = 51;

// Basic mock reusable IDs
const dashboardsItemId = basicMock.navItems.primaryItems[0].id;
const tlsCertificatesItemId = basicMock.navItems.primaryItems[2].sections?.[0].items[1].id;
const settingsItemId = basicMock.navItems.footerItems[2].id;
const advancedSettingsItemId = basicMock.navItems.footerItems[2].sections?.[0].items[1].id;

// Security mock reusable IDs
const mlItemId = securityMock.navItems.primaryItems[11].id;

// Observability mock reusable IDs
const appsItemId = observabilityMock.navItems.primaryItems[6].id;
const infrastructureItemId = observabilityMock.navItems.primaryItems[7].id;
const machineLearningItemId = observabilityMock.navItems.primaryItems[10].id;

describe('Both modes', () => {
  let user: ReturnType<typeof userEvent.setup>;

  let restoreWindowSize: () => void;

  beforeAll(() => {
    mockClientHeight(mockMenuItemHeight);
  });

  beforeEach(() => {
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
      pointerEventsCheck: 0,
    });
  });

  afterEach(() => {
    if (restoreWindowSize) restoreWindowSize();
  });

  it('should render the side navigation', () => {
    const { container } = render(
      <TestComponent items={basicMock.navItems} logo={basicMock.logo} />
    );

    expect(container).toMatchSnapshot();
  });

  describe('Solution logo', () => {
    /**
     * GIVEN the solution logo is displayed in the navigation
     * WHEN I click the solution logo
     * THEN I should be redirected to the solution’s homepage
     */
    it('should redirect to the solution homepage when clicked', () => {
      render(<TestComponent items={basicMock.navItems} logo={basicMock.logo} />);

      const solutionLogo = screen.getByRole('link', {
        name: 'Solution homepage',
      });
      const expectedHref = basicMock.logo.href;

      expect(solutionLogo).toHaveAttribute('href', expectedHref);

      user.click(solutionLogo);
    });

    /**
     * GIVEN the current page is the solution’s homepage
     * WHEN the navigation renders
     * THEN the solution logo is in an active state
     */
    it('should have active state if the initial active item is the homepage', () => {
      render(
        <TestComponent
          items={basicMock.navItems}
          logo={basicMock.logo}
          initialActiveItemId={basicMock.logo.id}
        />
      );

      const solutionLogo = screen.getByRole('link', {
        name: 'Solution homepage',
      });

      expect(solutionLogo).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Responsive mode', () => {
    /**
     * GIVEN the screen size is less than `s` (767px)
     * WHEN the navigation renders
     * THEN it shows in collapsed mode
     */
    it('should render in collapsed mode if the screen size is less than `s` (767px)', () => {
      restoreWindowSize = resizeWindow(640, 480);

      render(
        <TestComponent
          items={basicMock.navItems}
          logo={basicMock.logo}
          initialActiveItemId={basicMock.logo.id}
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
     * GIVEN the screen size is more or equal to `s` (767px)
     * WHEN the navigation renders
     * THEN the navigation should be in expanded mode
     */
    it('should render in expanded mode if the screen size is more or equal to `s` (767px)', () => {
      restoreWindowSize = resizeWindow(1024, 768);

      render(
        <TestComponent
          items={basicMock.navItems}
          logo={basicMock.logo}
          initialActiveItemId={basicMock.logo.id}
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
       * GIVEN the initial active item is a primary menu item
       * WHEN the navigation renders
       * THEN this primary menu item is in an active state
       */
      it('should have active state if the initial active item is the primary menu item', () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={dashboardsItemId}
          />
        );

        const dashboardsLink = screen.getByRole('link', {
          name: 'Dashboards',
        });

        // Current item should have both aria-current and be highlighted
        expect(dashboardsLink).toHaveAttribute('aria-current', 'page');
        expect(dashboardsLink).toHaveAttribute('data-highlighted', 'true');

        const discoverLink = screen.getByRole('link', {
          name: 'Discover',
        });

        // Non-current item should not have aria-current and not be highlighted
        expect(discoverLink).not.toHaveAttribute('aria-current', 'page');
        expect(discoverLink).toHaveAttribute('data-highlighted', 'false');
      });

      /**
       * GIVEN the initial active item is a submenu item
       * WHEN the navigation renders
       * THEN its parent primary menu item is in a visually active state
       * AND a side panel with the submenu opens
       * AND the submenu item is in an active state (`aria-current="page"`)
       */
      it('should have active state if the initial active item is the submenu item', async () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={tlsCertificatesItemId}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: /Apps/i,
        });

        expect(appsLink).toHaveAttribute('data-highlighted', 'true');
        expect(appsLink).not.toHaveAttribute('aria-current', 'page');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Apps',
        });

        const tlsCertificatesLink = within(sidePanel).getByRole('link', {
          name: 'TLS certificates',
        });

        // Only the actual active submenu item should have aria-current="page"
        expect(tlsCertificatesLink).toHaveAttribute('aria-current', 'page');
        expect(tlsCertificatesLink).toHaveAttribute('data-highlighted', 'true');
      });

      /**
       * GIVEN a primary menu item without a submenu is not active
       * WHEN I click on it
       * THEN this primary menu item becomes active
       */
      it('(without submenu) should have active state after clicking on it', async () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={dashboardsItemId}
          />
        );

        const discoverLink = screen.getByRole('link', { name: 'Discover' });

        // Initially not current and not highlighted
        expect(discoverLink).not.toHaveAttribute('aria-current', 'page');
        expect(discoverLink).toHaveAttribute('data-highlighted', 'false');

        await user.click(discoverLink);

        // After clicking, should be both current and highlighted
        expect(discoverLink).toHaveAttribute('aria-current', 'page');
        expect(discoverLink).toHaveAttribute('data-highlighted', 'true');
      });

      /**
       * GIVEN a primary menu item with a submenu is not active
       * WHEN I click on it
       * THEN the primary menu item becomes active
       * AND a side panel with its submenu opens
       * AND the first item in the submenu is in an active state by default
       */
      it('(with submenu) should have active state after clicking on it, and a side panel should open', async () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={settingsItemId}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: /Apps/i,
        });

        await user.click(appsLink);

        expect(appsLink).toHaveAttribute('aria-current', 'page');
        expect(appsLink).toHaveAttribute('data-highlighted', 'true');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Apps',
        });

        expect(sidePanel).toBeInTheDocument();

        const overviewLink = within(sidePanel).getByRole('link', {
          name: 'Overview',
        });

        // First submenu item should be current and highlighted
        expect(overviewLink).toHaveAttribute('aria-current', 'page');
        expect(overviewLink).toHaveAttribute('data-highlighted', 'true');
      });

      /**
       * GIVEN a primary menu item with a submenu where parent and child have different IDs
       * WHEN I click on it to activate the child
       * THEN the parent should be highlighted but NOT current
       * AND the child should be both current and highlighted
       */
      it('(with submenu) should show correct states when parent and child have different IDs', async () => {
        // Create a modified navigation structure where parent and child have different IDs
        const modifiedNavItems = {
          ...basicMock.navItems,
          primaryItems: [
            ...basicMock.navItems.primaryItems.slice(0, 2),
            {
              ...basicMock.navItems.primaryItems[2],
              id: 'parent_different_id',
              sections: [
                {
                  ...basicMock.navItems.primaryItems[2].sections![0],
                  items: [
                    {
                      id: 'child_different_id',
                      label: 'Child with different ID',
                      href: '/child_different',
                    },
                    ...basicMock.navItems.primaryItems[2].sections![0].items.slice(1),
                  ],
                },
              ],
            },
          ],
        };

        render(
          <TestComponent
            items={modifiedNavItems}
            logo={basicMock.logo}
            initialActiveItemId="child_different_id"
          />
        );

        const parentLink = screen.getByRole('link', {
          name: /Apps/i,
        });

        const sidePanel = screen.getByRole('region', {
          name: /Side panel/,
        });

        const childLink = within(sidePanel).getByRole('link', {
          name: 'Child with different ID',
        });

        // Parent should be highlighted but NOT current (since child has different ID and is the active one)
        expect(parentLink).not.toHaveAttribute('aria-current', 'page');
        expect(parentLink).toHaveAttribute('data-highlighted', 'true');

        // Child should be both current and highlighted
        expect(childLink).toHaveAttribute('aria-current', 'page');
        expect(childLink).toHaveAttribute('data-highlighted', 'true');
      });

      /**
       * GIVEN a primary menu item with a submenu is active
       * WHEN I click on a different item in its submenu
       * THEN the parent primary menu item remains in an active state
       * AND the clicked submenu item becomes active
       */
      it('(with submenu) should still have active state after clicking on another submenu item', async () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={tlsCertificatesItemId}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: /Apps/i,
        });

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Apps',
        });

        let overviewLink = within(sidePanel).getByRole('link', {
          name: 'Overview',
        });

        const tlsCertificatesLink = within(sidePanel).getByRole('link', {
          name: 'TLS certificates',
        });

        expect(appsLink).toHaveAttribute('data-highlighted', 'true');
        expect(appsLink).not.toHaveAttribute('aria-current', 'page');

        expect(tlsCertificatesLink).toHaveAttribute('aria-current', 'page');
        expect(tlsCertificatesLink).toHaveAttribute('data-highlighted', 'true');

        await user.click(overviewLink);

        expect(appsLink).toHaveAttribute('data-highlighted', 'true');
        expect(appsLink).toHaveAttribute('aria-current', 'page');

        // "Overview" becomes stale and leads to incorrect assertions, we need to re-query the link
        overviewLink = within(sidePanel).getByRole('link', {
          name: 'Overview',
        });

        expect(overviewLink).toHaveAttribute('aria-current', 'page');
        expect(overviewLink).toHaveAttribute('data-highlighted', 'true');
      });
    });

    describe('Primary menu item limit', () => {
      /**
       * GIVEN fewer than 12 primary menu items exist (e.g. 10)
       * WHEN the navigation renders
       * THEN all provided items are displayed
       */
      it('should display all provided items when fewer than 12 exist', () => {
        // Elasticsearch mock has exactly 10 primary menu items
        render(
          <TestComponent
            items={elasticsearchMock.navItems}
            logo={elasticsearchMock.logo}
            initialActiveItemId={dashboardsItemId}
          />
        );

        elasticsearchMock.navItems.primaryItems.forEach((item) => {
          const link = screen.getByRole('link', {
            name: item.label,
          });

          expect(link).toBeInTheDocument();
        });

        const moreButton = screen.queryByRole('button', {
          name: 'More',
        });

        expect(moreButton).not.toBeInTheDocument();
      });

      /**
       * GIVEN exactly 12 primary menu items exist
       * WHEN the navigation renders
       * THEN all provided items are displayed
       */
      it('should display all 12 provided items when exactly 12 exist', () => {
        // Observability mock has exactly 11 primary menu items
        const navigationWithTwelveItems = {
          ...observabilityMock,
          navItems: {
            ...observabilityMock.navItems,
            primaryItems: [
              ...observabilityMock.navItems.primaryItems,
              {
                id: 'new-item',
                label: 'New Item',
                icon: 'new_item',
                href: '/new-item',
                iconType: 'star',
              },
            ],
          },
        };

        // Renders exactly 12 primary menu items
        render(
          <TestComponent
            items={navigationWithTwelveItems.navItems}
            logo={navigationWithTwelveItems.logo}
            initialActiveItemId={dashboardsItemId}
          />
        );

        observabilityMock.navItems.primaryItems.forEach((item) => {
          const link = screen.getByRole('link', {
            name: item.label,
          });

          expect(link).toBeInTheDocument();
        });

        const moreButton = screen.queryByRole('button', {
          name: 'More',
        });

        expect(moreButton).not.toBeInTheDocument();
      });

      /**
       * GIVEN more than 12 primary menu items exist (e.g. 13)
       * WHEN the navigation renders
       * THEN only 11 of those primary menu items display
       * AND a "More" menu item displays
       * AND it has a submenu with the 2 primary menu items left
       */
      it('should display a "More" menu item with a submenu when more than 12 exist', async () => {
        // Security mock has exactly 13 primary menu items
        render(
          <TestComponent
            items={securityMock.navItems}
            logo={securityMock.logo}
            initialActiveItemId={dashboardsItemId}
          />
        );

        securityMock.navItems.primaryItems.slice(0, 11).forEach((item) => {
          const link = screen.getByRole('link', {
            name: item.label,
          });

          expect(link).toBeInTheDocument();
        });

        const twelfthLink = screen.queryByRole('link', {
          name: securityMock.navItems.primaryItems[11].label,
        });

        expect(twelfthLink).not.toBeInTheDocument();

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        expect(moreButton).toBeInTheDocument();

        await user.hover(moreButton);
        flushPopoverTimers();

        const morePopover = await screen.findByRole('dialog', {
          name: 'More',
        });

        // We can have both `link` and `button` in the "More" menu
        securityMock.navItems.primaryItems.slice(11).forEach((item) => {
          // `button` -> item with a submenu, `link` -> item without a submenu
          const role = !!item.sections?.length ? 'button' : 'link';
          const element = within(morePopover).getByRole(role, {
            name: item.label,
          });

          expect(element).toBeInTheDocument();
        });
      });
    });

    describe('More menu', () => {
      /**
       * GIVEN not all primary menu items fit the menu height
       * WHEN I click on the "More" primary menu
       * THEN a popover should appear with the submenu
       * AND when I hover out the popover should persist
       */
      it('should have persistent popover on hover out after the trigger was clicked', async () => {
        // Security mock has exactly 13 primary menu items
        render(
          <TestComponent
            items={securityMock.navItems}
            logo={securityMock.logo}
            initialActiveItemId={dashboardsItemId}
          />
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        await user.hover(moreButton);
        flushPopoverTimers();

        const morePopover = await screen.findByRole('dialog', {
          name: 'More',
        });

        expect(morePopover).toBeInTheDocument();

        await user.click(moreButton);

        expect(morePopover).toBeInTheDocument();

        await user.unhover(moreButton);

        expect(morePopover).toBeInTheDocument();

        const solutionLogo = screen.getByRole('link', {
          name: 'Security homepage',
        });

        await user.click(solutionLogo);

        // Popover has a delay on hover out so we need to await the assertion
        await waitFor(() => {
          expect(morePopover).not.toBeInTheDocument();
        });
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * WHEN I click on the “More” primary menu
       * AND when I hover over another popover trigger
       * THEN the popover attached to that trigger should not show
       */
      it('should not show another popover when the "More" popover is open', async () => {
        // Security mock has exactly 13 primary menu items
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        await user.click(moreButton);

        const morePopover = screen.getByRole('dialog', {
          name: 'More',
        });

        expect(morePopover).toBeInTheDocument();

        const investigationsLink = screen.getByRole('link', {
          name: 'Investigations',
        });

        await user.hover(investigationsLink);
        flushPopoverTimers();

        const investigationsPopover = screen.queryByRole('dialog', {
          name: 'Investigations',
        });

        expect(investigationsPopover).not.toBeInTheDocument();
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the initial active item is a primary menu item within the "More" menu
       * WHEN the navigation renders
       * THEN the "More" primary menu item itself is in an active state
       */
      it('should show correct active states when active item is in "More" menu', async () => {
        // Security mock has exactly 13 primary menu items
        render(
          <TestComponent
            items={securityMock.navItems}
            logo={securityMock.logo}
            initialActiveItemId={mlItemId}
          />
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        expect(moreButton).toHaveAttribute('data-highlighted', 'true');

        await user.hover(moreButton);
        flushPopoverTimers();

        const morePopover = await screen.findByRole('dialog', {
          name: 'More',
        });

        const mlButton = within(morePopover).getByRole('button', {
          name: 'Machine learning',
        });

        expect(mlButton).toHaveAttribute('data-highlighted', 'true');

        await user.click(mlButton);

        const mlHeader = await within(morePopover).findByText('Machine learning');

        expect(mlHeader).toBeInTheDocument();
      });
    });
  });

  describe('Footer', () => {
    describe('Footer item', () => {
      /**
       * GIVEN the initial active item is a footer item
       * WHEN the navigation renders
       * THEN this footer item is in an active state
       */
      it('should have active state if the initial active item is the footer item', () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={settingsItemId}
          />
        );

        const settingsLink = screen.getByRole('link', {
          name: 'Settings',
        });

        expect(settingsLink).toHaveAttribute('aria-current', 'page');
      });

      /**
       * GIVEN the initial active item is a footer submenu item
       * WHEN the navigation renders
       * THEN its parent footer item is in an active state
       * AND a side panel with the submenu opens
       * AND the footer submenu item is in an active state
       */
      it('should have active state if the initial active item is the footer submenu item', async () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={advancedSettingsItemId}
          />
        );

        const settingsLink = screen.getByRole('link', {
          name: 'Settings',
        });

        expect(settingsLink).toHaveAttribute('data-highlighted', 'true');
        expect(settingsLink).not.toHaveAttribute('aria-current', 'page');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Settings',
        });

        expect(sidePanel).toBeInTheDocument();

        const advancedSettings = within(sidePanel).getByRole('link', {
          name: 'Advanced settings',
        });

        expect(advancedSettings).toHaveAttribute('aria-current', 'page');
        expect(advancedSettings).toHaveAttribute('data-highlighted', 'true');
      });

      /**
       * GIVEN a footer item with a submenu is not active
       * WHEN I click on it
       * THEN the footer item becomes active
       * AND a side panel with its submenu opens
       * AND the first item in the submenu is in an active state by default
       */
      it('(with submenu) should have active state after clicking on it, and a side panel should open', async () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={settingsItemId}
          />
        );

        const settingsLink = screen.getByRole('link', {
          name: 'Settings',
        });

        await user.click(settingsLink);

        expect(settingsLink).toHaveAttribute('aria-current', 'page');
        expect(settingsLink).toHaveAttribute('data-highlighted', 'true');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Settings',
        });

        expect(sidePanel).toBeInTheDocument();

        const integrationsLink = within(sidePanel).getByRole('link', {
          name: 'Integrations',
        });

        // First submenu item should be current and highlighted (same ID as parent = same page)
        expect(integrationsLink).toHaveAttribute('aria-current', 'page');
        expect(integrationsLink).toHaveAttribute('data-highlighted', 'true');
      });

      /**
       * GIVEN a footer item with a submenu is active
       * WHEN I click on a different item in its submenu
       * THEN the parent footer item remains in an active state
       * AND the clicked submenu item becomes active
       */
      it('(with submenu) should still have active state after clicking on another submenu item', async () => {
        render(
          <TestComponent
            items={basicMock.navItems}
            logo={basicMock.logo}
            initialActiveItemId={advancedSettingsItemId}
          />
        );

        const settingsLink = screen.getByRole('link', {
          name: 'Settings',
        });

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Settings',
        });

        let integrationsLink = within(sidePanel).getByRole('link', {
          name: 'Integrations',
        });

        await user.click(integrationsLink);

        // Parent should be highlighted and current (because it represents the same page)
        expect(settingsLink).toHaveAttribute('data-highlighted', 'true');
        expect(settingsLink).toHaveAttribute('aria-current', 'page');

        // "Integrations" becomes stale and leads to incorrect assertions, we need to re-query the link
        integrationsLink = within(sidePanel).getByRole('link', {
          name: 'Integrations',
        });

        // Clicked submenu item should be current and highlighted (same ID as parent = same page)
        expect(integrationsLink).toHaveAttribute('aria-current', 'page');
        expect(integrationsLink).toHaveAttribute('data-highlighted', 'true');
      });

      /**
       * GIVEN there are footer items
       * WHEN I hover over a footer item
       * THEN a tooltip appears with the item label
       * AND when I click on the trigger
       * AND then I hover out
       * THEN the tooltip disappears
       */
      it('should display a tooltip with the item label on hover, and hide on hover out', async () => {
        render(<TestComponent items={basicMock.navItems} logo={basicMock.logo} />);

        const developerToolsLink = screen.getByRole('link', {
          name: 'Developer tools',
        });

        await user.hover(developerToolsLink);
        flushPopoverTimers();

        const tooltip = await screen.findByRole('tooltip', {
          name: 'Developer tools',
        });

        expect(tooltip).toBeInTheDocument();

        await user.click(developerToolsLink);
        await user.unhover(developerToolsLink);

        // Even after clicking on the trigger which makes the `EuiToolTip` persistent by default
        // See: https://eui.elastic.co/docs/components/display/tooltip/
        await waitFor(() => {
          expect(tooltip).not.toBeInTheDocument();
        });
      });
    });

    describe('Footer item limit', () => {
      /**
       * GIVEN fewer than 5 footer items exist
       * WHEN the navigation renders
       * THEN all existing footer items are displayed
       */
      it('should display all existing footer items if fewer than 5 exist', () => {
        // Renders 3 footer items
        render(<TestComponent items={observabilityMock.navItems} logo={observabilityMock.logo} />);

        const footer = screen.getByRole('contentinfo', { name: 'Side navigation' });
        const footerItems = within(footer).getAllByRole('link');

        expect(footerItems.length).toBe(3);
      });

      /**
       * GIVEN exactly 5 footer items exist
       * WHEN the navigation renders
       * THEN all 5 items are displayed
       */
      it('should display all 5 footer items if exactly 5 exist', () => {
        // Renders 5 footer items
        render(<TestComponent items={basicMock.navItems} logo={basicMock.logo} />);

        const footer = screen.getByRole('contentinfo', { name: 'Side navigation' });
        const footerItems = within(footer).getAllByRole('link');

        expect(footerItems.length).toBe(5);
      });

      /**
       * GIVEN 6 footer items exist
       * WHEN the navigation renders
       * THEN only 5 footer items are displayed
       */
      it('should display only 5 footer items if 6 or more exist', () => {
        const navItemsWithSixFooterItems = {
          ...basicMock.navItems,
          footerItems: [
            ...basicMock.navItems.footerItems,
            {
              id: 'extra_footer_item',
              label: 'Extra footer',
              href: '/extra-footer',
              iconType: 'extra',
            },
          ],
        };

        render(<TestComponent items={navItemsWithSixFooterItems} logo={basicMock.logo} />);

        const footer = screen.getByRole('contentinfo', { name: 'Side navigation' });
        const footerItems = within(footer).getAllByRole('link');

        expect(footerItems.length).toBe(5);
      });
    });

    describe('Beta badge', () => {
      /**
       * GIVEN a footer item is in beta
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with beta icon
       */
      it('should render a tooltip with the item label and a beta badge with beta icon', async () => {
        render(<TestComponent items={observabilityMock.navItems} logo={observabilityMock.logo} />);

        const footer = await screen.findByRole('contentinfo', { name: 'Side navigation' });

        const gettingStartedLink = within(footer).getByRole('link', {
          name: 'Getting started',
        });

        await user.hover(gettingStartedLink);
        flushPopoverTimers();

        const tooltip = await screen.findByRole('tooltip');

        expect(tooltip).toHaveTextContent('Getting started');

        const betaIcon = tooltip.querySelector('[data-euiicon-type="beta"]');

        expect(betaIcon).toBeInTheDocument();
      });
    });

    describe('Tech preview badge', () => {
      /**
       * GIVEN a footer item is in tech preview
       * WHEN I hover over that item
       * THEN a tooltip shows up with the item label
       * AND a beta badge with flask icon
       */
      it('should render a tooltip with the item label and a beta badge with flask icon', async () => {
        render(<TestComponent items={observabilityMock.navItems} logo={observabilityMock.logo} />);

        const gettingStartedLink = screen.getByRole('link', {
          name: 'Developer tools',
        });

        await user.hover(gettingStartedLink);
        flushPopoverTimers();

        const tooltip = await screen.findByRole('tooltip');

        expect(tooltip).toHaveTextContent('Developer tools');

        const flaskIcon = tooltip.querySelector('[data-euiicon-type="flask"]');

        expect(flaskIcon).toBeInTheDocument();
      });
    });
  });

  describe('Secondary menu', () => {
    describe('Beta badge', () => {
      /**
       * GIVEN a primary menu item is in beta
       * WHEN the navigation renders the secondary menu header
       * THEN a beta badge with beta icon appears next to the menu title
       */
      it('should render a beta badge with beta icon next to the menu title', async () => {
        render(
          <TestComponent
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            initialActiveItemId={appsItemId}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Apps',
        });
        const panelHeader = within(sidePanel).getByRole('heading', {
          name: 'Apps',
        });
        const betaBadge = await within(panelHeader.parentElement!).findByTitle('Beta');

        expect(betaBadge).toBeInTheDocument();
      });

      /**
       * GIVEN a menu item is in beta
       * WHEN the navigation renders the secondary menu items
       * THEN a beta badge with beta icon appears next to the menu item label
       */
      it('should render a beta badge with beta icon next to the menu item label', async () => {
        render(
          <TestComponent
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            initialActiveItemId={appsItemId}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Apps',
        });
        const tlsCertificatesLink = within(sidePanel).getByRole('link', {
          name: 'TLS certificates Beta',
        });
        const betaBadge = await within(tlsCertificatesLink).findByTitle('Beta');

        expect(betaBadge).toBeInTheDocument();
      });
    });

    describe('Tech preview badge', () => {
      /**
       * GIVEN a primary menu item is in tech preview
       * WHEN the navigation renders the secondary menu header
       * THEN a beta badge with flask icon appears next to the menu title
       */
      it('should render a beta badge with flask icon next to the menu title', async () => {
        render(
          <TestComponent
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            initialActiveItemId={machineLearningItemId}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Machine learning',
        });
        const panelHeader = within(sidePanel).getByRole('heading', {
          name: 'Machine learning',
        });
        const techPreviewBadge = await within(panelHeader.parentElement!).findByTitle(
          'Tech preview'
        );

        expect(techPreviewBadge).toBeInTheDocument();
      });

      /**
       * GIVEN a menu item is in tech preview
       * WHEN the navigation renders the secondary menu items
       * THEN a beta badge with flask icon appears next to the menu item label
       */
      it('should render a beta badge with flask icon next to the menu item label', async () => {
        render(
          <TestComponent
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            initialActiveItemId={infrastructureItemId}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Infrastructure',
        });
        const hostsLink = within(sidePanel).getByRole('link', {
          name: 'Hosts Tech preview',
        });
        const techPreviewBadge = await within(hostsLink).findByTitle('Tech preview');

        expect(techPreviewBadge).toBeInTheDocument();
      });
    });

    describe('External links', () => {
      /**
       * GIVEN a menu item is an external link
       * WHEN the navigation renders the menu item
       * THEN a popout icon is displayed next to the link text
       */
      it('should render a popout icon next to the link text', async () => {
        render(
          <TestComponent
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            initialActiveItemId={appsItemId}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Apps',
        });
        const tracesLink = within(sidePanel).getByRole('link', {
          name: /traces/i,
        });
        const externalIcon = tracesLink.querySelector('[data-euiicon-type="popout"]');

        expect(externalIcon).toBeInTheDocument();
      });

      /**
       * GIVEN a menu item is an external link
       * WHEN I click on the link
       * THEN it is opened in a new tab
       */
      it('should open the link in a new tab', () => {
        render(
          <TestComponent
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            initialActiveItemId={appsItemId}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel for Apps',
        });
        const tracesLink = within(sidePanel).getByRole('link', {
          name: /traces/i,
        });

        expect(tracesLink).toHaveAttribute('target', '_blank');
      });
    });
  });

  describe('Keyboard navigation', () => {
    describe('Menu navigation', () => {
      /**
       * GIVEN focus is on any menu item within a menu (primary, footer, or submenu)
       * WHEN I press the Arrow Down or Arrow Up key
       * THEN focus moves to the next or previous item in that menu, respectively
       */
      it('should move focus to the next or previous item in the menu when pressing Arrow Down or Arrow Up', async () => {
        render(<TestComponent items={basicMock.navItems} logo={basicMock.logo} />);

        const primaryMenu = await screen.findByRole('navigation', { name: 'Main' });
        const dashboardsLink = await screen.findByRole('link', { name: 'Dashboards' });
        const discoverLink = await screen.findByRole('link', { name: 'Discover' });

        act(() => {
          dashboardsLink.focus();
        });

        expect(dashboardsLink).toHaveFocus();

        fireEvent.keyDown(primaryMenu, { key: 'ArrowDown', code: 'ArrowDown' });

        expect(discoverLink).toHaveFocus();

        fireEvent.keyDown(primaryMenu, { key: 'ArrowUp', code: 'ArrowUp' });

        expect(dashboardsLink).toHaveFocus();
      });

      /**
       * GIVEN focus is on any menu item within a menu (primary, footer, or submenu)
       * AND I am navigating with a keyboard
       * WHEN I repeatedly press the Tab key
       * THEN focus moves sequentially through the primary menu, the footer menu,
       * and the side panel (if open), before moving to the main page content
       */
      it('should move focus through all navigable menus when pressing Tab', async () => {
        render(
          <TestComponent
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            initialActiveItemId={appsItemId}
          />
        );

        const solutionLogo = screen.getByRole('link', { name: 'Observability homepage' });
        const discoverLink = screen.getByRole('link', { name: 'Discover' });
        const gettingStartedLink = screen.getByRole('link', { name: 'Getting started' });
        const sidePanel = screen.getByRole('region', { name: 'Side panel for Apps' });
        const serviceInventoryLink = within(sidePanel).getByRole('link', {
          name: 'Service inventory',
        });

        act(() => {
          solutionLogo.focus();
        });

        expect(solutionLogo).toHaveFocus();

        // Tab to primary menu - should land on first focusable item (Dashboards)
        await user.tab();

        expect(discoverLink).toHaveFocus();

        // Tab to footer menu - should land on first focusable item (Getting started)
        await user.tab();

        expect(gettingStartedLink).toHaveFocus();

        // Tab to side panel - should land on first focusable item (Service inventory)
        await user.tab();

        expect(serviceInventoryLink).toHaveFocus();
      });

      /**
       * GIVEN I am navigating with a keyboard
       * AND focus is in the primary menu, the footer menu, the popover or the side panel
       * WHEN I press the Home or End key
       * THEN focus moves to the first or last item in that menu, respectively
       */
      it('should move focus to the first or last item in the menu when pressing Home or End', async () => {
        render(<TestComponent items={basicMock.navItems} logo={basicMock.logo} />);

        const solutionLogo = screen.getByRole('link', { name: 'Solution homepage' });
        const dashboardsLink = screen.getByRole('link', { name: 'Dashboards' });
        const appsLink = screen.getByRole('link', { name: /Apps/i });

        await user.tab();

        expect(solutionLogo).toHaveFocus();

        await user.tab();

        expect(dashboardsLink).toHaveFocus();

        await user.keyboard('{end}');

        expect(appsLink).toHaveFocus();

        await user.keyboard('{home}');

        expect(dashboardsLink).toHaveFocus();
      });
    });

    describe('Popover navigation', () => {
      /**
       * GIVEN I am navigating with a keyboard
       * AND focus is inside an open popover
       * WHEN I repeatedly press the Arrow Down or Arrow Up key
       * THEN focus cycles only through the interactive elements within that container
       * AND does not leave it
       */
      it('should cycle focus through interactive elements in the popover when pressing Arrow Down or Arrow Up', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const assetsLink = screen.getByRole('link', { name: 'Assets' });

        act(() => {
          assetsLink.focus();
        });

        const popover = await screen.findByRole('dialog', { name: 'Assets' });
        const popoverLinks = within(popover).queryAllByRole('link');

        const firstItem = popoverLinks[0];
        const secondItem = popoverLinks[1];
        const penultimateItem = popoverLinks[popoverLinks.length - 2];
        const lastItem = popoverLinks[popoverLinks.length - 1];

        act(() => {
          firstItem.focus();
        });

        // Pressing Arrow Down from first item should move to the second
        await user.keyboard('{ArrowDown}');

        expect(secondItem).toHaveFocus();

        // Pressing Arrow Down from last item should wrap to first
        await user.keyboard('{end}');

        expect(lastItem).toHaveFocus();

        await user.keyboard('{ArrowDown}');

        expect(firstItem).toHaveFocus();

        // Pressing Arrow Up from first item should wrap to last
        await user.keyboard('{ArrowUp}');

        expect(lastItem).toHaveFocus();

        // Pressing Arrow Up from the last item should move to the penultimate item
        await user.keyboard('{ArrowUp}');

        expect(penultimateItem).toHaveFocus();
      });

      /**
       * GIVEN I am navigating with a keyboard
       * AND focus is in an open popover
       * WHEN I press the Home or End key
       * THEN focus moves to the first or last item in that popover, respectively
       */
      it('should move focus to the first or last item in the popover when pressing Home or End', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', { name: 'More' });

        act(() => {
          moreButton.focus();
        });

        await user.click(moreButton);

        const popover = screen.getByRole('dialog', { name: 'More' });
        const popoverLinks = within(popover).queryAllByRole('link');
        const popoverButtons = within(popover).queryAllByRole('button');
        const popoverItems = [...popoverButtons, ...popoverLinks];

        const firstItem = popoverItems[0];
        const lastItem = popoverItems[popoverItems.length - 1];

        act(() => {
          firstItem.focus();
        });

        // Pressing End should move focus to the last item
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{end}');

        expect(lastItem).toHaveFocus();

        // Pressing Home should move focus to the first item
        await user.keyboard('{home}');

        expect(firstItem).toHaveFocus();
      });

      /**
       * GIVEN the focus is inside the popover
       * WHEN I press the Escape key
       * THEN the popover closes
       * AND focus returns to the menu item that originally opened it
       */
      it('should return focus to the menu item that opened the popover when it is closed', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', { name: 'More' });

        await user.click(moreButton);

        const popover = screen.getByRole('dialog', { name: 'More' });

        expect(popover).toBeInTheDocument();

        // Move focus to the first item in the popover
        await user.keyboard('{Enter}');

        // Exit the popover
        await user.keyboard('{Escape}');

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        expect(moreButton).toHaveFocus();
      });

      /**
       * GIVEN the focus is inside the popover
       * WHEN I press the Tab key
       * THEN the popover closes
       * AND focus moves to the next primary menu or footer menu item
       */
      it('should move focus to the next primary menu or footer menu item when pressing Tab', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', { name: 'More' });

        act(() => {
          moreButton.focus();
        });

        const popover = await screen.findByRole('dialog', { name: 'More' });

        expect(popover).toBeInTheDocument();

        // Move focus to the first item in the popover
        await user.keyboard('{Enter}');

        // Move focus out of the popover to the next primary menu or footer menu item
        await user.tab();

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        const gettingStartedLink = await screen.findByRole('link', { name: 'Getting started' });

        expect(gettingStartedLink).toHaveFocus();
      });

      /**
       * GIVEN the focus is inside the popover
       * WHEN I press the Shift + Tab key
       * THEN the popover closes
       * AND focus moves to the previous primary menu or footer menu item
       */
      it('should move focus to the previous primary menu or footer menu item when pressing Shift + Tab', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', { name: 'More' });

        act(() => {
          moreButton.focus();
        });

        const popover = await screen.findByRole('dialog', { name: 'More' });

        expect(popover).toBeInTheDocument();

        // Move focus to the first item in the popover
        await user.keyboard('{Enter}');

        // Move focus out of the popover to the previous primary menu or footer menu item
        await user.tab({ shift: true });

        await waitFor(() => {
          expect(popover).not.toBeInTheDocument();
        });

        const assetsLink = screen.getByRole('link', { name: 'Assets' });

        expect(assetsLink).toHaveFocus();
      });
    });

    describe('More menu navigation', () => {
      /**
       * GIVEN the focus is in the "More" popover
       * WHEN I press Enter on a menu item with a submenu
       * THEN the nested panel opens
       * AND the "Go back" button receives focus
       */
      it('should focus the "Go back" button when opening a nested panel with Enter', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', { name: 'More' });

        act(() => {
          moreButton.focus();
        });

        const popover = await screen.findByRole('dialog', { name: 'More' });

        expect(popover).toBeInTheDocument();

        // Move focus to the "More" popover
        await user.keyboard('{Enter}');

        const machineLearningButton = within(popover).getByRole('button', {
          name: 'Machine learning',
        });

        expect(machineLearningButton).toHaveFocus();

        // Open the "Machine learning" nested panel
        await user.keyboard('{Enter}');

        const goBackButton = within(popover).getByRole('button', { name: 'Go back' });

        expect(goBackButton).toHaveFocus();
      });

      /**
       * GIVEN the focus is in the "More" popover nested submenu
       * WHEN I press Arrow Down or Arrow Up
       * THEN focus moves between the submenu items
       * AND does not leave the panel
       */
      it('should keep focus within nested submenu items when using arrow keys', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', { name: 'More' });

        act(() => {
          moreButton.focus();
        });

        const popover = await screen.findByRole('dialog', { name: 'More' });

        expect(popover).toBeInTheDocument();

        // Move focus to the "More" popover
        await user.keyboard('{Enter}');

        const machineLearningButton = within(popover).getByRole('button', {
          name: 'Machine learning',
        });

        expect(machineLearningButton).toHaveFocus();

        // Open the "Machine learning" nested panel
        await user.keyboard('{Enter}');

        // Move focus to the first item in the nested panel
        await user.keyboard('{ArrowDown}');

        const firstItem = within(popover).getByRole('link', {
          name: 'Overview',
        });

        expect(firstItem).toHaveFocus();

        // Move focus to the last item in the nested panel
        await user.keyboard('{End}');

        const lastItem = within(popover).getByRole('link', {
          name: 'Change point detection',
        });

        expect(lastItem).toHaveFocus();

        // Move focus to the penultimate item in the nested panel
        await user.keyboard('{ArrowUp}');

        const penultimateItem = within(popover).getByRole('link', {
          name: 'Log pattern analysis',
        });

        expect(penultimateItem).toHaveFocus();

        // Move focus to the "Go back" button in the nested panel
        await user.keyboard('{Home}');

        const goBackButton = within(popover).getByRole('button', { name: 'Go back' });

        expect(goBackButton).toHaveFocus();
      });

      /**
       * GIVEN the focus is in the "More" popover nested submenu
       * WHEN I focus the "Go back" button
       * AND I press Enter
       * THEN the nested panel closes
       * AND focus returns to the menu item that opened it
       */
      it('should return focus to the trigger that opened the nested panel when activating the "Go back" button', async () => {
        render(<TestComponent items={securityMock.navItems} logo={securityMock.logo} />);

        const moreButton = screen.getByRole('button', { name: 'More' });

        act(() => {
          moreButton.focus();
        });

        const popover = await screen.findByRole('dialog', { name: 'More' });

        expect(popover).toBeInTheDocument();

        // Move focus to the "More" popover
        await user.keyboard('{Enter}');

        const machineLearningButton = within(popover).getByRole('button', {
          name: 'Machine learning',
        });

        expect(machineLearningButton).toHaveFocus();

        // Open the "Machine learning" nested panel
        await user.keyboard('{Enter}');

        const goBackButton = within(popover).getByRole('button', { name: 'Go back' });

        expect(goBackButton).toHaveFocus();

        await user.click(goBackButton);

        // Expect the "Machine learning" button to regain focus
        expect(within(popover).getByRole('button', { name: 'Machine learning' })).toHaveFocus();
      });
    });
  });
});
