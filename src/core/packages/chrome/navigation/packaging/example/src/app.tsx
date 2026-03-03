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
import { css } from '@emotion/css';
import { EuiProvider, EuiSpacer, EuiText, EuiCode, useEuiTheme } from '@elastic/eui';

// @ts-expect-error — package must be built first.
import { OneNavigation } from '@kbn/one-navigation';
// @ts-expect-error — package must be built first.
import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/one-navigation';

/** Returns a `className` that adds a divider after the Dashboard nav item. */
const useNavDividerClass = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    .euiPopover:has(#dashboard) {
      position: relative;
      margin-bottom: ${euiTheme.size.m};

      &::after {
        content: '';
        position: absolute;
        bottom: calc(((${euiTheme.size.m} + ${euiTheme.size.l}) / 2) * -1);
        width: 32px;
        left: 50%;
        transform: translateX(-50%);
        height: ${euiTheme.border.width.thin};
        background-color: ${euiTheme.colors.borderBaseSubdued};
      }
    }
  `;
};

const App = () => {
  const [navigationWidth, setNavigationWidth] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState('dashboard');

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
              { id: 'analytics-overview', label: 'Overview', href: '#/analytics' },
              { id: 'sales-report', label: 'Sales Report', href: '#/analytics/sales' },
              { id: 'traffic-report', label: 'Traffic Report', href: '#/analytics/traffic' },
            ],
          },
          {
            id: 'metrics-section',
            label: 'Metrics',
            items: [{ id: 'performance', label: 'Performance', href: '#/analytics/performance' }],
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
              { id: 'data-sources', label: 'Data Sources', href: '#/data/sources' },
              { id: 'data-quality', label: 'Data Quality', href: '#/data/quality' },
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
    setActiveItemId(item.id);

    if (item.href) {
      window.history.pushState({}, '', item.href);
    }
  };

  const navDividerClass = useNavDividerClass();

  return (
    <EuiProvider colorMode="light">
      <div className={navDividerClass} style={{ display: 'flex', minHeight: '100vh' }}>
        <OneNavigation
          {...{ activeItemId, logo }}
          items={navigationItems}
          isCollapsed={isCollapsed}
          onItemClick={handleItemClick}
          onToggleCollapsed={setIsCollapsed}
          setWidth={setNavigationWidth}
        />

        <main
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
              Active item: <EuiCode>{activeItemId}</EuiCode>
            </p>
            <p>
              Navigation width: <EuiCode>{navigationWidth}px</EuiCode>
            </p>
            <p>
              Collapsed: <EuiCode>{String(isCollapsed)}</EuiCode>
            </p>
          </EuiText>

          <EuiSpacer />

          <EuiText>
            <h2>Test cases</h2>
            <ul>
              <li>Click navigation items — state updates above.</li>
              <li>Toggle collapsed via the built-in collapse button.</li>
              <li>Hover collapsed items to see popovers.</li>
              <li>Test nested navigation items (Analytics, Data).</li>
              <li>Resize the window to test responsive behaviour.</li>
            </ul>
          </EuiText>
        </main>
      </div>
    </EuiProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default App;
