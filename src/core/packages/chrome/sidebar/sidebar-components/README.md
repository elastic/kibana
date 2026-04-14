# @kbn/core-chrome-sidebar-components

Public React components and hooks for interacting with the Chrome Sidebar in plugins. Provides `Sidebar`, `SidebarHeader`, `SidebarBody`, and hooks such as `useSidebar`, `useSidebarApp`, `useSidebarPanel`, and `useSidebarWidth`.

```tsx
import { SidebarHeader, SidebarBody, useSidebarApp, useSidebarPanel } from '@kbn/core-chrome-sidebar-components';

// Access app API from hooks
const myApp = useSidebarApp('mySidebarApp');
myApp.actions.openWithData(data);
myApp.open(); // Opens with default state

// myApp.status is reactive: 'available', 'pending', or 'unavailable'
```
