# API reference

## Package

`@kbn/ui-side-navigation` · `src/platform/kbn-ui/side-navigation`

## Exports

| Export | Description |
| ------ | ------------- |
| `Navigation` | Root component |
| `NavigationProps` | Props |
| `useNavigation` | Active / highlight / panel state |
| `COLLAPSED_WIDTH` (48), `EXPANDED_WIDTH` (100) | Primary rail widths |
| `MenuItem`, `SecondaryMenuItem`, `SecondaryMenuSection`, `NavigationStructure`, `SideNavLogo`, `BadgeType` | Types (`types.ts`) |

## `NavigationProps`

| Prop | Required | Description |
| ---- | -------- | ----------- |
| `items` | yes | `{ primaryItems, footerItems }` |
| `logo` | yes | `SideNavLogo` |
| `isCollapsed` | yes | Controlled collapsed state |
| `setWidth` | yes | Total nav width for layout slot |
| `activeItemId` | no | Current route id |
| `onItemClick` | no | Logo, primary, secondary, footer |
| `onToggleCollapsed` | no | Shows collapse control |
| `sidePanelFooter` | no | Node below secondary links |
| `data-test-subj` | no | Default `kbnChromeNav-root` |

## Data model

Children use **`sections`**, not `secondaryItems`:

```ts
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
        { id: 'sales', label: 'Sales', href: '/analytics/sales', badgeType: 'beta' },
        { id: 'docs', label: 'Docs', href: 'https://…', isExternal: true },
      ],
    },
  ],
}
```

## Constants

| Name | Value |
| ---- | ----- |
| `MAX_MENU_ITEMS` | 12 |
| `MAX_FOOTER_ITEMS` | 5 |
| `SIDE_PANEL_WIDTH` | 248 |
| `NAVIGATION_SELECTOR_PREFIX` | `kbnChromeNav` |

## EUI

- `iconType`: EUI `IconType`
- Breakpoints: `useIsWithinBreakpoints(['xs', 's'])` forces collapse
- Tooltips, popovers, badges from EUI patterns

## Accessibility

Roving tabindex, single `aria-current="page"`, screen-reader instructions on first item per region, focus return to main content when closing popovers (`focusMainContent`).

## Related

- [examples.md](./examples.md) — full wiring samples
- [kibana-integration.md](./kibana-integration.md) — chrome adapter · standalone `packaging/` via `.agents/kbn-ui-packages/SKILL.md`
