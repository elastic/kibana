# Share plugin

The `share` plugin contains various utilities for displaying sharing context menu,
generating deep links to other apps using *locators*, and creating short URLs.


## Sharing context menu

You can register an item into sharing context menu (which is displayed in
Dashboard, Discover, and Visualize apps).

### Example registration

```ts
import { ShareContext, ShareMenuItem } from 'src/plugins/share/public';

plugins.share.register({
  id: 'demo',
  getShareMenuItems: (context) => [
    {
      panel: {
        id: 'demo',
        title: 'Panel title',
        content: 'Panel content',
      },
      shareMenuItem: {
        name: 'Demo list item (from share_example plugin)',
      },
    }
  ],
});
```

Now the "Demo list item" will appear under the "Share" menu in Discover and
Dashboard applications.


## Locators


## Short URLs

