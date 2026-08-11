# AppMenuComponent

`AppMenuComponent` is the standalone component used in chrome app menu.

## Usage

```tsx
import React, { useEffect } from 'react';
import { AppMenuComponent, type AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

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
