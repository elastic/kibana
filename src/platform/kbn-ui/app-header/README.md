# @kbn/ui-app-header

Props-driven AppHeader presentation for Kibana UI. Usable without Kibana Core or Chrome services.

## Usage

```tsx
import React from 'react';
import { AppHeaderView, type AppHeaderViewProps } from '@kbn/ui-app-header';

const Example = (props: AppHeaderViewProps) => {
  return <AppHeaderView {...props} />;
};
```

Pass final back `href` values — this package does not look up or prepend the Kibana base path.
Back semantics (IA parent vs satellite origin, required `label`, when to omit back) live in the
[`@kbn/app-header` README](../../../core/packages/chrome/app-header/README.md#back-navigation).
Badges and app-menu static items must already be resolved. An optional `fallbackMenu` node covers
the legacy action-menu mount path.

## Compatibility

Plugins should import from `@kbn/app-header`. That package is the Core-connected facade: it
resolves base-path-prefixed back targets, Chrome badges, documentation/feedback/integrations menu
items, and the inline slot.

`@kbn/core-chrome-browser` re-exports the same presentation types (`AppHeaderConfig` and related)
so existing type imports remain valid.
