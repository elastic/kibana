# @kbn/app-menu

Types and `AppMenuComponent` for the Kibana app menu.

Most pages should pass `menu` to [`AppHeader`](../../../app-header) (or `ChromeAppHeaderRegistration`). Type that slot as `AppHeaderMenu` from `@kbn/app-header`:

```tsx
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';

const menu: AppHeaderMenu = { /* items */ };

<AppHeader title="My page" menu={menu} />;
```

Use this package when you need item types (`AppMenuItemType`, `AppMenuPopoverItem`, …) to build that config, or when you must mount `AppMenuComponent` outside the header.

[`@kbn/ui-app-menu`](../../../../../platform/kbn-ui/app-menu) is the portable implementation.
