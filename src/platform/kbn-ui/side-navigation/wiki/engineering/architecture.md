# Architecture

## Component tree

```
Navigation
├── SideNavCollapseButton
└── SideNav (root)
    ├── SideNav.Logo
    ├── SideNav.PrimaryMenu
    │   ├── PrimaryMenuItem × N
    │   ├── SideNav.Popover (preview / collapsed hover)
    │   └── SideNav.NestedSecondaryMenu ("More")
    ├── SideNav.SidePanel (expanded secondary)
    │   └── SideNav.SecondaryMenu
    └── SideNav.Footer
```

`Navigation` owns orchestration: active ids, collapse, responsive overflow, badge dismissal, and width reporting via `setWidth`.

## Key hooks

| Hook | Responsibility |
| --- | --- |
| `useNavigation` | Active item resolution, open panel/popover ids, click handlers |
| `useResponsiveMenu` | Measures primary column; splits `visibleMenuItems` vs `overflowMenuItems` |
| `useLayoutWidth` | Reports total chrome width (primary + optional side panel) via `setWidth` |
| `useNewItems` | Caps and persists dismissed `new` badges |
| `useScrollToActive` | Scrolls active item into view in long lists |
| `useHoverTimeout` | Debounced popover open (`POPOVER_HOVER_DELAY = 300ms`) |

## Layout constants

| Constant | Value | Meaning |
| --- | --- | --- |
| `COLLAPSED_WIDTH` | 48px | Primary bar width when collapsed |
| `EXPANDED_WIDTH` | 100px | Primary bar width when expanded |
| `SIDE_PANEL_WIDTH` | 248px | Secondary panel width (implementation; product target is 240px default) |
| `MAX_MENU_ITEMS` | 12 | Visible primary slots before overflow logic triggers |
| `MAX_FOOTER_ITEMS` | 5 | Hard cap on footer items |

`COLLAPSED_WIDTH` and `EXPANDED_WIDTH` are exported from `@kbn/ui-side-navigation` for use by layout consumers.

## State ownership

| State | Owned by |
| --- | --- |
| Collapsed preference | Kibana chrome (`BehaviorSubject` + `localStorage`). `Navigation` accepts `isCollapsed` and optional `onToggleCollapsed`. |
| Active route | Parent supplies `activeItemId` from the router / app status. |
| Width | Parent grid uses `setWidth` to size the nav slot. |
| New badge dismissal | `useNewItems` → `localStorage` via `core.chrome.sidenav.newItems`. |

## Package surface

Public exports from `@kbn/ui-side-navigation` (`index.ts`):

- `Navigation`, `NavigationProps`
- `useNavigation`
- `COLLAPSED_WIDTH`, `EXPANDED_WIDTH`
- Types: `BadgeType`, `MenuItem`, `NavigationStructure`, `SecondaryMenuItem`, `SecondaryMenuSection`, `SideNavLogo`

Packaging for external consumers lives under `packaging/` (webpack bundle, i18n, troubleshooting docs).
