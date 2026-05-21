# API reference

## Navigation component

```tsx
import { Navigation } from '@kbn/ui-side-navigation';
```

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
    {
      id: 'analytics',
      label: 'Analytics',
      iconType: 'graphApp',
      href: '/analytics',
      sections: [
        {
          id: 'reports',
          label: 'Reports',
          items: [
            { id: 'overview', label: 'Overview', href: '/analytics' },
            { id: 'traffic', label: 'Traffic', href: '/analytics/traffic', isExternal: true },
            { id: 'conversion', label: 'Conversion', href: '/analytics/conversion', badgeType: 'new' },
          ],
        },
      ],
    },
  ],
  footerItems: [
    { id: 'settings', label: 'Settings', iconType: 'gear', href: '/settings' },
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
