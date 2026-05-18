# Examples

Full app wiring and annotated `items` shapes (from former package README).

## Basic setup

```tsx
import { useState } from 'react';
import {
  Navigation,
  type MenuItem,
  type SecondaryMenuItem,
  type SideNavLogo,
} from '@kbn/ui-side-navigation';

const navigationItems = {
  primaryItems: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      iconType: 'dashboardApp',
      href: '/dashboard',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      iconType: 'graphApp',
      href: '/analytics',
      sections: [
        {
          id: 'analytics-section',
          items: [
            { id: 'overview', label: 'Overview', href: '/analytics' },
            { id: 'reports', label: 'Reports', href: '/analytics/reports' },
            { id: 'metrics', label: 'Metrics', href: '/analytics/metrics' },
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
      href: '/settings',
    },
  ],
};

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState('dashboard');

  const handleItemClick = (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
    setActiveItemId(item.id);
    // navigate + analytics
  };

  return (
    <>
      <Navigation
        activeItemId={activeItemId}
        isCollapsed={isCollapsed}
        items={navigationItems}
        logo={{
          label: 'Observability',
          id: 'observability',
          iconType: 'observabilityApp',
          href: '/observability',
        }}
        onItemClick={handleItemClick}
        onToggleCollapsed={setIsCollapsed}
        setWidth={setNavigationWidth}
      />
      <main>{/* app content */}</main>
    </>
  );
}
```

## Navigation structure (annotated)

```ts
export const navigationItems = {
  primaryItems: [
    {
      id: 'overview',
      label: 'Overview',
      iconType: 'info',
      href: '/overview',
      badgeType: 'techPreview',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      iconType: 'graphApp',
      href: '/analytics/reports',
      sections: [
        {
          id: 'reports-section',
          label: 'Reports', // omit for unlabeled sections
          items: [
            {
              id: 'analytics',
              label: 'Overview',
              href: '/analytics/reports', // often matches parent landing
            },
            {
              id: 'sales-report',
              label: 'Sales report',
              href: '/analytics/sales',
              badgeType: 'beta',
            },
            {
              id: 'traffic-report',
              label: 'Traffic report',
              href: '/analytics/traffic',
              isExternal: true,
            },
            {
              id: 'conversion-report',
              label: 'Conversion report',
              href: '/analytics/conversion',
              badgeType: 'new',
            },
          ],
        },
      ],
    },
  ],
  footerItems: [
    {
      id: 'settings',
      label: 'Settings', // required for accessibility even when label hidden in footer
      iconType: 'gear',
      href: '/settings',
    },
  ],
};
```

Props reference: [api.md](./api.md). Badges: [../badges.md](../badges.md).
