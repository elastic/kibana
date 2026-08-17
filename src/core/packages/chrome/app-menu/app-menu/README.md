# @kbn/app-menu

Types and `AppMenuComponent` for the Kibana app menu.

Most pages should pass `menu` to [`AppHeader`](../../../app-header) (or `ChromeAppHeaderRegistration`) instead of rendering this component. Use this package when you need menu item types, or when you must mount `AppMenuComponent` outside the header.

[`@kbn/ui-app-menu`](../../../../../platform/kbn-ui/app-menu) is the portable implementation.

```tsx
import { AppHeader } from '@kbn/app-header';
import type { AppMenuConfig } from '@kbn/app-menu';

const menu: AppMenuConfig = { /* items */ };

<AppHeader title="My page" menu={menu} />;
```
