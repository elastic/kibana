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
the active EUI theme breakpoints. It collapses at `xs` and `s`, shows its medium layout at `m` and
`l`, and shows the full menu at `xl`. This includes width changes caused by pushed flyouts.

When no Chrome application measurement is available, the menu falls back to the corresponding
viewport breakpoint. Menus that should always follow the viewport, such as the Classic Chrome
header, set `breakpointSource="viewport"`.
