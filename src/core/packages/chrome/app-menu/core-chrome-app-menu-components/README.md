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

Inside the Chrome application layout, the menu responds to the application's available width. It
collapses below 800px, shows its medium layout from 800px to 1199px, and shows the full menu at
1200px or wider. This includes width changes caused by pushed flyouts.

When no Chrome application container is available, such as standalone or Classic Chrome usage, the
menu falls back to viewport breakpoints. Consumers do not need to measure the menu or provide a
collapsed state.
