# AppMenuComponent

`AppMenuComponent` is the replacement for the existing `TopNavMenu` component, providing an improved API and enhanced functionality for building app menu in your application.

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
