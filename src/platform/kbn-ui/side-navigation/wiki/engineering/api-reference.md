# API reference

`@kbn/ui-side-navigation` is an adaptive side navigation widget built with [Elastic UI](https://eui.elastic.co/). It supports responsive layout, nested menu structures (secondary panel, More overflow), and accessibility-first keyboard behavior.

## Navigation component

```tsx
import { Navigation } from '@kbn/ui-side-navigation';
import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/ui-side-navigation';
```

### Basic setup

```tsx
import { useState } from 'react';
import { Navigation } from '@kbn/ui-side-navigation';
import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/ui-side-navigation';

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
      label: 'Settings', // required for accessibility (footer labels are icon-only in the UI)
      iconType: 'gear',
      href: '/settings',
    },
  ],
};

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState('dashboard');
  const [navigationWidth, setNavigationWidth] = useState(0);

  const handleItemClick = (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
    setActiveItemId(item.id);
    // analytics, routing, etc.
  };

  return (
    <div className="app">
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
      <main className="app-content">{/* application content */}</main>
    </div>
  );
}
```

Pass navigation data via the `items` prop (`NavigationStructure`). Each primary `MenuItem` may include a `sections` array of `SecondaryMenuSection` objects (not a flat `secondaryItems` list).

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | `NavigationStructure` | Yes | `primaryItems` and `footerItems` |
| `logo` | `SideNavLogo` | Yes | Solution home link |
| `isCollapsed` | `boolean` | Yes | Controlled collapse state (forced true on xs/s breakpoints) |
| `setWidth` | `(width: number) => void` | Yes | Reports total nav width to the layout grid |
| `activeItemId` | `string` | No | Current route id for active highlighting |
| `onItemClick` | `(item: MenuItem \| SecondaryMenuItem \| SideNavLogo) => void` | No | Click telemetry or side effects |
| `onToggleCollapsed` | `(isCollapsed: boolean) => void` | No | Persist collapse preference (chrome service callback) |
| `sidePanelFooter` | `ReactNode` | No | Footer slot inside the secondary panel |
| `data-test-subj` | `string` | No | Root test subject |

## NavigationStructure

```ts
interface NavigationStructure {
  primaryItems: MenuItem[];
  footerItems: MenuItem[];
}
```

## MenuItem (primary)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique id; matches route for active state |
| `label` | `string` | Yes | Visible label (top items in expanded mode; also required for footer a11y) |
| `href` | `string` | Yes | Landing URL (first child destination when sections exist) |
| `iconType` | `IconType` | Yes | EUI icon type |
| `sections` | `SecondaryMenuSection[]` | No | Secondary menu content |
| `badgeType` | `'beta' \| 'techPreview' \| 'new'` | No | Badge variant |
| `data-test-subj` | `string` | No | Testing |

## SecondaryMenuSection

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Section id |
| `label` | `string` | No | Section header; omit for unlabeled groups |
| `items` | `SecondaryMenuItem[]` | Yes | Links in this section |

## SecondaryMenuItem

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique id |
| `label` | `string` | Yes | Must match the destination page title |
| `href` | `string` | Yes | Destination URL |
| `badgeType` | `BadgeType` | No | Badge |
| `isExternal` | `boolean` | No | Opens in new tab + shows external icon |
| `data-test-subj` | `string` | No | Testing |

## SideNavLogo

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Route id for active state |
| `label` | `string` | Yes | Accessible name |
| `href` | `string` | Yes | Home URL |
| `iconType` | `string` | Yes | Solution app icon (for example `observabilityApp`) |
| `data-test-subj` | `string` | No | Testing |

## Example structure

```ts
import type { NavigationStructure } from '@kbn/ui-side-navigation';

const items: NavigationStructure = {
  primaryItems: [
    // Simple primary item
    {
      id: 'overview',
      label: 'Overview',
      iconType: 'info',
      href: '/overview',
      badgeType: 'techPreview',
    },
    // Primary item with secondary sections
    {
      id: 'analytics',
      label: 'Analytics',
      iconType: 'graphApp',
      href: '/analytics/reports',
      sections: [
        {
          id: 'reports-section',
          label: 'Reports', // omit `label` for unlabeled sections
          items: [
            {
              id: 'analytics', // may match parent id when overview shares parent href
              label: 'Overview',
              href: '/analytics/reports',
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
              isExternal: true, // new tab + external icon
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
      label: 'Settings',
      iconType: 'gear',
      href: '/settings',
    },
  ],
};
```

## Test selectors

Prefix: `kbnChromeNav` (`NAVIGATION_SELECTOR_PREFIX`). Common selectors:

| Selector | Element |
| --- | --- |
| `kbnChromeNav-root` | Navigation root wrapper |
| `kbnChromeNav-moreMenu` | More menu trigger |
| `kbnChromeNav-mainPanel` | Secondary side panel |
| `kbnChromeNav-primaryNavigation` | Primary nav region |
