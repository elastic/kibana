/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { EXPANDED_MENU_GAP, EXPANDED_MENU_ITEM_HEIGHT, MAX_MENU_ITEMS } from '../constants';
import { Navigation } from '../components/navigation';
import { basicMock } from '../mocks/basic_navigation';
import { createBoundingClientRectMock } from './create_bounding_client_rect_mock';
import { elasticsearchMock } from '../mocks/elasticsearch';
import { observabilityMock } from '../mocks/observability';
import { resizeWindow } from './resize_window';
import { securityMock } from '../mocks/security';
import { getHasSubmenu } from '../utils/get_has_submenu';

const SPACE_MARGIN = 100;

// Basic mock reusable IDs
const dashboardsItemId = basicMock.navItems.primaryItems[0].id;
const tlsCertificatesItemId = basicMock.navItems.primaryItems[2].sections?.[0].items[1].id;
const settingsItemId = basicMock.navItems.footerItems[2].id;
const advancedSettingsItemId = basicMock.navItems.footerItems[2].sections?.[0].items[1].id;

// Security mock reusable IDs
const machinelearningItemId = securityMock.navItems.primaryItems[11].id;

// Observability mock reusable IDs
const appsItemId = observabilityMock.navItems.primaryItems[6].id;
const infrastructureItemId = observabilityMock.navItems.primaryItems[7].id;
const machineLearningItemId = observabilityMock.navItems.primaryItems[10].id;

describe('Both modes', () => {
  let restoreWindowSize: () => void;

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  beforeAll(() => {
    Element.prototype.getBoundingClientRect = createBoundingClientRectMock(
      (EXPANDED_MENU_ITEM_HEIGHT + EXPANDED_MENU_GAP) * (MAX_MENU_ITEMS - 1) +
        (EXPANDED_MENU_ITEM_HEIGHT + EXPANDED_MENU_GAP) +
        SPACE_MARGIN
    );
  });

  afterAll(() => {
    if (restoreWindowSize) restoreWindowSize();
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
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
     * GIVEN the solution logo is displayed in the navigation
     * WHEN I click the solution logo
     * THEN I should be redirected to the solution’s homepage
     */
    it('should redirect to the solution homepage when clicked', () => {
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
      const expectedHref = basicMock.logo.href;

      expect(solutionLogo).toHaveAttribute('href', expectedHref);

      userEvent.click(solutionLogo);
    });

    /**
     * GIVEN the current page is the solution’s homepage
     * WHEN the navigation renders
     * THEN the solution logo is in an active state
     */
    it('should have active state if the initial active item is the homepage', () => {
      render(
        <Navigation
          activeItemId={basicMock.logo.id}
          isCollapsed={false}
          items={basicMock.navItems}
          logo={basicMock.logo}
          setWidth={() => {}}
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
        <Navigation
          activeItemId={basicMock.logo.id}
          isCollapsed={false}
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

    // TODO: potentially move to an FTR test
    /**
     * GIVEN the screen size is less than `s` (767px)
     * WHEN I resize the window to be larger
     * THEN the navigation should be in expanded mode
     */
    /* it('should render in expanded mode if the screen size is less than `s` (767px) and I resize the window to be larger', () => {
      resizeWindow(640, 480);
      render(
        <Navigation
          activeItemId={basicMock.logo.id}
          isCollapsed={false}
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

      cleanUp = resizeWindow(1024, 768);

      expect(solutionLogo.children[1].className).not.toContain('euiScreenReaderOnly');
    }); */

    /**
     * GIVEN the screen size is more or equal to `s` (767px)
     * WHEN the navigation renders
     * THEN the navigation should be in expanded mode
     */
    it('should render in expanded mode if the screen size is more or equal to `s` (767px)', () => {
      restoreWindowSize = resizeWindow(1024, 768);
      render(
        <Navigation
          activeItemId={basicMock.logo.id}
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
       * GIVEN the initial active item is a primary menu item
       * WHEN the navigation renders
       * THEN this primary menu item is in an active state
       */
      it('should have active state if the initial active item is the primary menu item', () => {
        render(
          <Navigation
            activeItemId={dashboardsItemId}
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
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
          <Navigation
            activeItemId={tlsCertificatesItemId}
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        // Parent should be visually highlighted but not have aria-current since child is the actual active item
        expect(appsLink).toHaveAttribute('data-highlighted', 'true');
        expect(appsLink).not.toHaveAttribute('aria-current', 'page');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = useState(dashboardsItemId);

          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed={false}
                items={basicMock.navItems}
                logo={basicMock.logo}
                onItemClick={(item) => setActiveItemId(item.id)}
                setWidth={() => {}}
              />
            </I18nProvider>
          );
        };

        render(<TestComponent />);

        const discoverLink = screen.getByRole('link', { name: 'Discover' });

        // Initially not current and not highlighted
        expect(discoverLink).not.toHaveAttribute('aria-current', 'page');
        expect(discoverLink).toHaveAttribute('data-highlighted', 'false');

        await userEvent.click(discoverLink);

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
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = useState(settingsItemId);

          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed={false}
                items={{
                  ...basicMock.navItems,
                  primaryItems: basicMock.navItems.primaryItems.map((item) => ({
                    ...item,
                    onClick: () => {
                      const hasSubmenu = getHasSubmenu(item);
                      const firstChild = item.sections?.[0].items?.[0].id;

                      if (hasSubmenu && firstChild) {
                        setActiveItemId(firstChild);
                      } else {
                        setActiveItemId(item.id);
                      }
                    },
                  })),
                }}
                logo={basicMock.logo}
                setWidth={() => {}}
              />
            </I18nProvider>
          );
        };

        render(<TestComponent />);

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        await userEvent.click(appsLink);

        // Parent should be both current and highlighted (since parent and first child have same ID)
        expect(appsLink).toHaveAttribute('aria-current', 'page');
        expect(appsLink).toHaveAttribute('data-highlighted', 'true');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
          <I18nProvider>
            <Navigation
              activeItemId="child_different_id"
              isCollapsed={false}
              items={modifiedNavItems}
              logo={basicMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
        );

        const parentLink = screen.getByRole('link', {
          name: 'Apps',
        });

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = useState(tlsCertificatesItemId);

          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed={false}
                items={basicMock.navItems}
                logo={basicMock.logo}
                onItemClick={(item) => setActiveItemId(item.id)}
                setWidth={() => {}}
              />
            </I18nProvider>
          );
        };

        render(<TestComponent />);

        const appsLink = screen.getByRole('link', {
          name: 'Apps',
        });

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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

        await userEvent.click(overviewLink);

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
        render(
          <Navigation
            activeItemId={dashboardsItemId}
            isCollapsed={false}
            // Elasticsearch mock has exactly 10 primary menu items
            items={elasticsearchMock.navItems}
            logo={elasticsearchMock.logo}
            setWidth={() => {}}
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
          <Navigation
            activeItemId={dashboardsItemId}
            isCollapsed={false}
            items={navigationWithTwelveItems.navItems}
            logo={navigationWithTwelveItems.logo}
            setWidth={() => {}}
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
       * AND it has a submenu with the 1 primary menu item left
       */
      it('should display a "More" menu item with a submenu when more than 12 exist', async () => {
        render(
          <I18nProvider>
            <Navigation
              activeItemId={dashboardsItemId}
              isCollapsed={false}
              // Security mock has exactly 13 primary menu items
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
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

        await userEvent.hover(moreButton);

        const morePopover = screen.getByRole('dialog', {
          name: 'More',
        });

        securityMock.navItems.primaryItems.slice(11).forEach((item) => {
          const link = within(morePopover).getByRole('link', {
            name: item.label,
          });

          expect(link).toBeInTheDocument();
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
        render(
          <I18nProvider>
            <Navigation
              activeItemId={dashboardsItemId}
              isCollapsed={false}
              // Security mock has exactly 13 primary menu items
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

        const morePopover = screen.getByRole('dialog', {
          name: 'More',
        });

        expect(morePopover).toBeInTheDocument();

        await userEvent.click(moreButton);

        expect(morePopover).toBeInTheDocument();

        await userEvent.unhover(moreButton);

        expect(morePopover).toBeInTheDocument();

        const solutionLogo = screen.getByRole('link', {
          name: 'Security homepage',
        });

        await userEvent.click(solutionLogo);

        // Popover has a delay on hover out so we need to await the assertion
        await waitFor(() => {
          expect(morePopover).not.toBeInTheDocument();
        });
      });

      /**
       * GIVEN not all primary menu items fit the menu height
       * AND the initial active item is a primary menu item within the "More" menu
       * WHEN the navigation renders
       * THEN the "More" primary menu item itself is in an active state
       */
      it('should show correct active states when active item is in "More" menu', async () => {
        render(
          <I18nProvider>
            <Navigation
              activeItemId={machinelearningItemId}
              isCollapsed={false}
              // Security mock has exactly 13 primary menu items
              items={securityMock.navItems}
              logo={securityMock.logo}
              setWidth={() => {}}
            />
          </I18nProvider>
        );

        const moreButton = screen.getByRole('button', {
          name: 'More',
        });

        // More button should be highlighted when containing active item but not marked as current page
        expect(moreButton).toHaveAttribute('data-highlighted', 'true');

        await userEvent.hover(moreButton);

        const morePopover = screen.getByRole('dialog', {
          name: 'More',
        });

        const mlLink = within(morePopover).getByRole('link', {
          name: 'Machine learning',
        });

        expect(mlLink).toHaveAttribute('aria-current', 'page');
        expect(mlLink).toHaveAttribute('data-highlighted', 'true');
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
          <Navigation
            activeItemId={settingsItemId}
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
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
          <Navigation
            activeItemId={advancedSettingsItemId}
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const settingsLink = screen.getByRole('link', {
          name: 'Settings',
        });

        // Parent should be highlighted but not current (child is current)
        expect(settingsLink).toHaveAttribute('data-highlighted', 'true');
        expect(settingsLink).not.toHaveAttribute('aria-current', 'page');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = useState<string | undefined>();
          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed={false}
                items={{
                  ...basicMock.navItems,
                  footerItems: basicMock.navItems.footerItems.map((item) => ({
                    ...item,
                    onClick: () => {
                      // If item has submenus, set the first child item as active
                      if (
                        item.sections &&
                        item.sections.length > 0 &&
                        item.sections[0].items.length > 0
                      ) {
                        setActiveItemId(item.sections[0].items[0].id);
                      } else {
                        setActiveItemId(item.id);
                      }
                    },
                  })),
                }}
                logo={basicMock.logo}
                setWidth={() => {}}
              />
            </I18nProvider>
          );
        };

        render(<TestComponent />);

        const settingsLink = screen.getByRole('link', {
          name: 'Settings',
        });

        await userEvent.click(settingsLink);

        // Parent should be both current and highlighted (since parent and first child have same ID)
        expect(settingsLink).toHaveAttribute('aria-current', 'page');
        expect(settingsLink).toHaveAttribute('data-highlighted', 'true');

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
        const TestComponent = () => {
          const [activeItemId, setActiveItemId] = useState(advancedSettingsItemId);

          return (
            <I18nProvider>
              <Navigation
                activeItemId={activeItemId}
                isCollapsed={false}
                items={basicMock.navItems}
                logo={basicMock.logo}
                onItemClick={(item) => setActiveItemId(item.id)}
                setWidth={() => {}}
              />
            </I18nProvider>
          );
        };

        render(<TestComponent />);

        const settingsLink = screen.getByRole('link', {
          name: 'Settings',
        });

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
        });

        let integrationsLink = within(sidePanel).getByRole('link', {
          name: 'Integrations',
        });

        await userEvent.click(integrationsLink);

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
        render(
          <Navigation
            isCollapsed
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const developerToolsLink = screen.getByRole('link', {
          name: 'Developer tools',
        });

        await userEvent.hover(developerToolsLink);

        const tooltip = await screen.findByRole('tooltip', {
          name: 'Developer tools',
        });

        expect(tooltip).toBeInTheDocument();

        await userEvent.click(developerToolsLink);
        await userEvent.unhover(developerToolsLink);

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
        render(
          <Navigation
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const footer = screen.getByRole('contentinfo', { name: 'Side navigation footer' });
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
        render(
          <Navigation
            isCollapsed={false}
            items={basicMock.navItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const footer = screen.getByRole('contentinfo', { name: 'Side navigation footer' });
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

        render(
          <Navigation
            isCollapsed={false}
            items={navItemsWithSixFooterItems}
            logo={basicMock.logo}
            setWidth={() => {}}
          />
        );

        const footer = screen.getByRole('contentinfo', { name: 'Side navigation footer' });
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
        render(
          <I18nProvider>
            <Navigation
              isCollapsed={false}
              items={observabilityMock.navItems}
              logo={observabilityMock.logo}
              onItemClick={() => {}}
              setWidth={() => {}}
            />
          </I18nProvider>
        );

        const footer = await screen.findByRole('contentinfo', { name: 'Side navigation footer' });

        const gettingStartedLink = within(footer).getByRole('link', {
          name: 'Getting started',
        });

        await userEvent.hover(gettingStartedLink);

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
        render(
          <Navigation
            isCollapsed
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const gettingStartedLink = screen.getByRole('link', {
          name: 'Developer tools',
        });

        await userEvent.hover(gettingStartedLink);

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
          <Navigation
            activeItemId={appsItemId}
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
          <Navigation
            activeItemId={appsItemId}
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
          <Navigation
            activeItemId={machineLearningItemId}
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
          <Navigation
            activeItemId={infrastructureItemId}
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
          <Navigation
            activeItemId={appsItemId}
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
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
          <Navigation
            activeItemId={appsItemId}
            isCollapsed={false}
            items={observabilityMock.navItems}
            logo={observabilityMock.logo}
            setWidth={() => {}}
          />
        );

        const sidePanel = screen.getByRole('region', {
          name: 'Side panel',
        });
        const tracesLink = within(sidePanel).getByRole('link', {
          name: /traces/i,
        });

        expect(tracesLink).toHaveAttribute('target', '_blank');
      });
    });
  });

  // TODO: potentially FTR test
  describe('Keyboard navigation', () => {
    /**
     * GIVEN focus is on any menu item within a menu (primary, footer, or submenu)
     * WHEN I press the Arrow Down or Arrow Up key
     * THEN focus moves to the next or previous item in that menu, respectively
     */
    it('should move focus to the next or previous item in the menu when pressing Arrow Down or Arrow Up', async () => {
      render(
        <Navigation
          isCollapsed={false}
          items={basicMock.navItems}
          logo={basicMock.logo}
          setWidth={() => {}}
        />
      );

      const primaryMenu = await screen.findByRole('navigation', { name: 'Main navigation' });
      const dashboardsLink = await screen.findByRole('link', { name: 'Dashboards' });
      const discoverLink = await screen.findByRole('link', { name: 'Discover' });

      dashboardsLink.focus();

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
     * THEN focus moves sequentially through the primary menu, the footer menu, and the side panel (if open), before moving to the main page content
     *
     * NOTE: With roving index, Tab only hits one focusable item per menu section
     */
    it('should move focus through all navigable menus when pressing Tab', async () => {
      render(
        <Navigation
          activeItemId={appsItemId}
          isCollapsed={false}
          items={observabilityMock.navItems}
          logo={observabilityMock.logo}
          setWidth={() => {}}
        />
      );

      const solutionLogo = screen.getByRole('link', { name: 'Observability homepage' });
      const discoverLink = screen.getByRole('link', { name: 'Discover' });
      const gettingStartedLink = screen.getByRole('link', { name: 'Getting started' });
      const sidePanel = screen.getByRole('region', { name: 'Side panel' });
      const serviceInventoryLink = within(sidePanel).getByRole('link', {
        name: 'Service inventory',
      });

      solutionLogo.focus();

      expect(solutionLogo).toHaveFocus();

      // Tab to primary menu - should land on first focusable item (Dashboards)
      await userEvent.tab();

      expect(discoverLink).toHaveFocus();

      // Tab to footer menu - should land on first focusable item (Getting started)
      await userEvent.tab();

      expect(gettingStartedLink).toHaveFocus();

      // Tab to side panel - should land on first focusable item (Service inventory)
      await userEvent.tab();

      expect(serviceInventoryLink).toHaveFocus();
    });

    /**
     * GIVEN I am navigating with a keyboard
     * AND focus is in the primary menu, the footer menu, the popover or the side panel
     * WHEN I press the Home or End key
     * THEN focus moves to the first or last item in that menu, respectively
     */

    it('should move focus to the first or last item in the menu when pressing Home or End', async () => {
      render(
        <Navigation
          isCollapsed={false}
          items={basicMock.navItems}
          logo={basicMock.logo}
          setWidth={() => {}}
        />
      );

      const primaryMenu = screen.getByRole('navigation', { name: 'Main navigation' });
      const solutionLogo = screen.getByRole('link', { name: 'Solution homepage' });
      const dashboardsLink = screen.getByRole('link', { name: 'Dashboards' });
      const appsLink = screen.getByRole('link', { name: 'Apps' });

      await userEvent.tab();

      expect(solutionLogo).toHaveFocus();

      await userEvent.tab();

      expect(dashboardsLink).toHaveFocus();

      fireEvent.keyDown(primaryMenu, { key: 'End', code: 'End' });

      expect(appsLink).toHaveFocus();

      fireEvent.keyDown(primaryMenu, { key: 'Home', code: 'Home' });

      expect(dashboardsLink).toHaveFocus();
    });

    /**
     * GIVEN focus is inside an open popover
     * WHEN I repeatedly press the Tab or Shift + Tab key
     * THEN focus cycles only through the interactive elements within that container and does not leave it
     */
    it('should cycle focus through interactive elements in the popover when pressing Tab or Shift + Tab', async () => {
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

      const moreButton = screen.getByRole('button', { name: 'More' });

      moreButton.focus();

      await userEvent.click(moreButton);

      const popover = screen.getByRole('dialog', { name: 'More' });
      const popoverItems = within(popover).getAllByRole('link');

      const firstItem = popoverItems[0];
      const lastItem = popoverItems[popoverItems.length - 1];

      firstItem.focus();

      await userEvent.keyboard('{end}');

      expect(lastItem).toHaveFocus();

      // Test focus trap by pressing tab from last item should wrap to first
      fireEvent.keyDown(popover, { key: 'Tab', code: 'Tab' });

      // Should wrap around to the first item
      expect(firstItem).toHaveFocus();
    });

    /**
     * GIVEN the focus is inside the popover
     * WHEN I press the Escape key
     * THEN the popover closes
     * AND focus returns to the menu item that originally opened it
     */

    it('should return focus to the menu item that opened the popover when it is closed', async () => {
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

      const moreButton = screen.getByRole('button', { name: 'More' });

      await userEvent.click(moreButton);

      const popover = screen.getByRole('dialog', { name: 'More' });

      expect(popover).toBeInTheDocument();

      await userEvent.keyboard('{escape}');

      await waitFor(() => {
        expect(popover).not.toBeInTheDocument();
      });

      expect(moreButton).toHaveFocus();
    });
  });
});
