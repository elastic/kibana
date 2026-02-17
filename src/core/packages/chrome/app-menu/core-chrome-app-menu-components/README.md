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
