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

## Compatibility

`@kbn/core-chrome-app-menu-components` re-exports this package for existing consumers.
