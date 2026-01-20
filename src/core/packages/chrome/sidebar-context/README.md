# @kbn/core-chrome-sidebar-context

React context for the Sidebar service.

This package is part of Kibana's shared dependencies (`kbn-ui-shared-deps-src`), ensuring all plugins share the same context instance at runtime.

```tsx
import { useSidebarService } from '@kbn/core-chrome-sidebar-context';

const sidebar = useSidebarService();
const myApp = sidebar.getApp('myApp');
myApp.open();
```
