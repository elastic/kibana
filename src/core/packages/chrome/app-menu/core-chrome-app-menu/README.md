# App Menu

`AppMenu` is the replacement for the existing `TopNavMenu` component, providing an improved API and enhanced functionality.

## Usage

- Declarative (preferred):

```tsx
import React, { useEffect } from 'react';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { CoreStart } from '@kbn/core/public';

interface Props {
  config: AppMenuConfig;
  core: CoreStart
}

const Example = ({ config, core }: Props) => {
  const { chrome } = core;

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};
```

- Imperative:

```tsx
import React, { useEffect } from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { CoreStart } from '@kbn/core/public';

interface Props {
  config: AppMenuConfig;
  core: CoreStart
}

const Example = ({ config, core }: Props) => {
  const { chrome } = core;

  useEffect(() => {
    chrome.setAppMenu(config);
  }, [chrome.setAppMenu, config]);

  return <div>Hello world!</div>;
};
```

## API changes

`AppMenu` offers a more restricted API than `TopNavMenu`.

1. Decoupling from `UnifiedSearch` - top nav menu will no longer be bundled with unified search. You will need to directly import unified search and render it.

2. Removal of badges - badges will no longer be available in top nav menu. According to UX guidelines, current badges should be moved to use breadcrumbs extension API.

3. `items` can only be `EuiHeaderLink` (a button with type `text`). For more advanced use cases, use action buttons.

4. Action buttons - `AppMenu` introduces action buttons:

    - `primaryActionButton` - this is meant to be used for primary actions (e.g saving), can be either an `EuiButton` or a split button, always placed as the rightmost item

    - `secondaryActionButton` - this is meant for secondary actions (e.g adding a new panel), can only be an `EuiButton`, placed to the left from `primaryActionButton`

5. Removal of `TopNavMenuExtensionsRegistry` - registering global items is no longer possible, add items locally to your application.
