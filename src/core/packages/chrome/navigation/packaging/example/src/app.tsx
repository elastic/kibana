/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/imports/no_unresolvable_imports */

import React, { useState } from 'react';
import { EuiProvider, EuiSpacer, EuiText, EuiCode } from '@elastic/eui';

// @ts-expect-error - have to build the package.
import { OneNavigation } from '@kbn/one-navigation';
// @ts-expect-error - have to build the package.
import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/one-navigation';

function App() {
  const [navigationWidth, setNavigationWidth] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState('dashboard');

  // Define navigation structure
  const navigationItems = {
    primaryItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        iconType: 'dashboardApp',
        href: '#/dashboard',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        iconType: 'graphApp',
        href: '#/analytics',
        sections: [
          {
            id: 'reports-section',
            label: 'Reports',
            items: [
              {
                id: 'analytics-overview',
                label: 'Overview',
                href: '#/analytics',
              },
              {
                id: 'sales-report',
                label: 'Sales Report',
                href: '#/analytics/sales',
              },
              {
                id: 'traffic-report',
                label: 'Traffic Report',
                href: '#/analytics/traffic',
              },
            ],
          },
          {
            id: 'metrics-section',
            label: 'Metrics',
            items: [
              {
                id: 'performance',
                label: 'Performance',
                href: '#/analytics/performance',
              },
            ],
          },
        ],
      },
      {
        id: 'data',
        label: 'Data',
        iconType: 'database',
        href: '#/data',
        sections: [
          {
            id: 'data-section',
            items: [
              {
                id: 'data-sources',
                label: 'Data Sources',
                href: '#/data/sources',
              },
              {
                id: 'data-quality',
                label: 'Data Quality',
                href: '#/data/quality',
              },
            ],
          },
        ],
      },
    ],
    footerItems: [
      {
        id: 'settings',
        label: 'Settings',
        iconType: 'gear',
        href: '#/settings',
      },
      {
        id: 'toggle-navigation',
        label: isCollapsed ? 'Expand navigation' : 'Collapse navigation',
        iconType: isCollapsed ? 'menuRight' : 'menuLeft',
        href: '#',
      },
    ],
  };

  const logo: SideNavLogo = {
    id: 'home',
    label: 'Example',
    iconType: 'logoElastic',
    href: '#/',
  };

  const handleItemClick = (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
    // eslint-disable-next-line no-console
    console.log('Navigation item clicked:', item);

    // Handle toggle navigation collapse/expand
    if (item.id === 'toggle-navigation') {
      setIsCollapsed(!isCollapsed);
      return;
    }

    setActiveItemId(item.id);

    // Prevent default link behavior for demo
    if (item.href) {
      window.history.pushState({}, '', item.href);
    }
  };

  return (
    <EuiProvider colorMode="light">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <OneNavigation
          items={navigationItems}
          logo={logo}
          isCollapsed={isCollapsed}
          activeItemId={activeItemId}
          onItemClick={handleItemClick}
          setWidth={setNavigationWidth}
          mainContentSelectors={['main', '[role="main"]']}
          mainScrollContainerId="app-content"
        />

        <main
          id="app-content"
          role="main"
          style={{
            flex: 1,
            padding: '24px',
            marginLeft: `${navigationWidth}px`,
            transition: 'margin-left 0.3s ease',
          }}
        >
          <EuiText>
            <h1>
              <EuiCode>OneNavigation</EuiCode> Example
            </h1>
            <p>
              Current active item: <EuiCode>{activeItemId}</EuiCode>
            </p>
            <p>
              Navigation width: <EuiCode>{navigationWidth}px</EuiCode>
            </p>
            <p>
              Collapsed: <EuiCode>{isCollapsed ? 'true' : 'false'}</EuiCode>
            </p>
          </EuiText>

          <EuiSpacer />

          <EuiText>
            <h2>Package Information</h2>
            <ul>
              <li>
                <strong>Package</strong>: <EuiCode>@kbn/one-navigation</EuiCode>
              </li>
              <li>
                <strong>Bundle Size</strong>: 25.8 KB (minified)
              </li>
              <li>
                <strong>Dependencies</strong>: React, EUI, Emotion (peer deps)
              </li>
              <li>
                <strong>i18n</strong>: No-op (default English messages)
              </li>
            </ul>
          </EuiText>

          <EuiSpacer />

          <EuiText>
            <h2>Test Cases</h2>
            <ul>
              <li>Click navigation items to see state updates</li>
              <li>Toggle collapsed state using the footer toggle item</li>
              <li>Hover over collapsed items to see popovers</li>
              <li>Test nested navigation items (Analytics, Data)</li>
              <li>Click footer items (Settings)</li>
              <li>Verify the footer toggle icon changes (menuLeft ↔ menuRight)</li>
              <li>Verify responsive behavior (resize window)</li>
              <li>Check console for errors</li>
            </ul>
          </EuiText>

          <EuiSpacer />

          <EuiText>
            <h2>HMR Compatible</h2>
            <p>
              This example application is HMR compatible. You can edit the code and see the changes
              live without having to refresh the page.
            </p>
          </EuiText>
        </main>
      </div>
    </EuiProvider>
  );
}

// eslint-disable-next-line import/no-default-export
export default App;
