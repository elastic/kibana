# @kbn/ui-app-menu

Props-driven AppMenu presentation components for Kibana UI. Usable without Kibana Core or Chrome services.

## Usage

```tsx
import React from 'react';
import { AppMenuComponent, type AppMenuConfig } from '@kbn/ui-app-menu';

interface Props {
  config: AppMenuConfig;
}

const Example = ({ config }: Props) => {
  return <AppMenuComponent config={config} />;
};
```

## Responsive behavior

Inside the Chrome application layout, the menu responds to the application's available width using
the active EUI theme breakpoints. It collapses at `xs`, shows its minimal layout at `s`, and shows the
full menu at `m`, `l`, and `xl`. This includes width changes caused by pushed flyouts.

When no Chrome application measurement is available, the menu falls back to the corresponding
viewport breakpoint using the previous viewport mapping: `xs` and `s` collapse, `m` and `l` use
the medium layout, and `xl` shows the full menu. Menus that should preserve viewport-based behavior,
such as the Classic and legacy Project Chrome headers, set `breakpointSource="viewport"`.

## Settings switches

Give an item `switches` instead of `run` or `items` to show a list of toggles, such as per-page
settings. Inline, the item opens a popover with the switches. In the overflow ("More") menu, the
switches are shown in a nested panel. Toggling a switch keeps the menu open.

```tsx
const settingsItem: AppMenuItemType = {
  id: 'settings',
  label: 'Settings',
  iconType: 'gear',
  overflow: true,
  switches: [{ id: 'syncAlerts', label: 'Sync alerts', checked, onChange: setChecked }],
};
```

Don't open your own popover from `run`: its `triggerElement` is unmounted when the item is rendered
inside the overflow menu.

## Loading skeleton

`AppMenuLoading` skeletons the same responsive layouts. Mount it in the same slot as
`AppMenuComponent` while the menu config is not ready. It defaults to one overflow-style
placeholder plus a primary-action rectangle; `buttonCount` is clamped to `APP_MENU_ITEM_LIMIT`.

```tsx
<AppMenuLoading />
<AppMenuLoading buttonCount={2} hasPrimary={false} />
```

Collapsed breakpoints show only the overflow placeholder (the primary action lives inside that
menu). Minimal shows overflow + primary. Expanded shows `buttonCount` icon placeholders + primary.

## Strict props

The public types are the contract. A type assertion can still pass a React node as a `label`, or
extra keys that get spread into EUI, and the menu paints custom UI.

The renderer only uses declared fields, and only as real strings. A non-string becomes empty (or is
omitted if optional); leftover keys are dropped. In development this logs a one-time `console.warn`.
Do not pass `FormattedMessage` or other nodes.

## Compatibility

`@kbn/core-chrome-app-menu-components` re-exports this package for existing consumers.
