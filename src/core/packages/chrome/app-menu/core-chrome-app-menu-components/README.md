# @kbn/core-chrome-app-menu-components

Compatibility re-export of [`@kbn/ui-app-menu`](../../../../platform/kbn-ui/app-menu).

## Usage

```tsx
import React from 'react';
import { AppMenuComponent, type AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

interface Props {
  config: AppMenuConfig;
}

const Example = ({ config }: Props) => {
  return <AppMenuComponent config={config} />;
};
```

## Related

- [`@kbn/ui-app-menu`](../../../../platform/kbn-ui/app-menu) — implementation (this package re-exports it)
