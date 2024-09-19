# Share plugin

The `share` plugin contains various utilities for displaying sharing context menu,
generating deep links to other apps, and creating short URLs.


## Sharing context menu

You can register an item into sharing context menu (which is displayed in
Dahsboard, Discover, and Visuzlize apps).

### Example registration

```ts
import { ShareContext, ShareMenuItem } from 'src/plugins/share/public';

plugins.share.register({
  id: 'MY_MENU',
  getShareMenuItems: (context: ShareContext): ShareMenuItem[] => {
    // ...
  },
};
```
