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

*Locators* are entities which given some *parameters* can navigate Kibana user
to some deep link in Kibana or return back a full formatted URL.

Kibana apps create locators and expose them from their plugin contracts. Then
other plugins can use those locators to navigate deeply into Kibana applications.

Locators work, both, on the server and browser. However, it is the responsibility
of the app, which provides the locator, to register and expose the same locator
on the server and browser.

### Creating a locator for your Kibana app

A Kibana app can create one or more *locators*, which given an object of *parameters*
knows how to specify return a *Kibana location* 3-tuple. The 3-tuple consists of:
(1) the app ID; (2) a path within the app; (3) a serializable *location state* object.
The Kibana location 3-tuple is used to navigate the Kibana app in SPA (single page app)
way&mdash;without reloading the page.

```ts
import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from 'src/plugins/share/public';

export interface HelloLocatorParams extends SerializableRecord {
  name: string;
}

export type HelloLocator = LocatorPublic<HelloLocatorParams>;

export class HelloLocatorDefinition implements LocatorDefinition<HelloLocatorParams> {
  public readonly id = 'HELLO_LOCATOR';

  public readonly getLocation = async ({ name }: HelloLocatorParams) => {
    return {
      app: 'sampleAppId',
      path: `/hello?name=${encodeURIComponent(name)}`,
      state: {},
    };
  };
}
```

Once your locator has been defined, you need to register it in the central locator
registry with the `share` plugin:

```ts
const locator = plugins.share.url.locators.create(new HelloLocatorDefinition());
```

You can then return the `locator` reference from your plugin contract fro consumption
by other plugins:

```ts
class MyPlugin {
  setup(core, plugins) {
    const locator = plugins.share.url.locators.create(new HelloLocatorDefinition());

    return {
      locator,
    };
  }
}
```

### Using locator of another app

First you need to get access of the locator you want to use. Best way to do it is
by acquiring it from the plugin contract of the app you are interested to navigate
to. For example, you can get hold of the Dashboard app locator from the `dashboard`
plugin contract:

```ts
class MyPlugin {
  setup(core, plugins) {
    const dashboardLocator = plugins.dashboard.locator;
  }
}
```

Alternatively, you can also acquire any locator from the central registry in
the `share` plugin using the ID of the locator. This is useful, if you run into
circular dependency issues, however, it is better to acquire the locator directly
from the plugin contract as above, which makes dependencies explicit.

You can use the `.get()` method on the locators service to acquire the locator
from the central registry:

```ts
class MyPlugin {
  setup(core, plugins) {
    const dashboardLocator = plugins.share.url.locators.get('DASHBOARD_APP_LOCATOR');
  }
}
```

Once have have a reference to the desired locator object, you can use that locator
to navigate to various pages in Kibana or use it to build a URL string.

The best way to use the locator is to use its `.navigateSync()` method to navigate
in SPA way (without page reload):

```ts
dashboardLocator.navigateSync({ dashboardId: '123' });
```

The above will immediately navigate to the Dashboard app, to the dashboard with
ID `123`.

Another useful feature of locators is their ability to format a URL string of the
destination. The best way to do it is using the `.getRedirectUrl()` method
of locators.

```ts
const url = dashboardLocator.getRedirectUrl({ dashboardId: '123' });
```

The above will generate a *redirect* URL, which also preserves the serializable
*location state* object, which will be passed to the destination app.

Alternatively, for compatibility with old URL generators, you can also use the
`.getUrl()` method of locators to generate just the final app destination URL
string without the location state object.

```ts
const url = await dashboardLocator.getUrl({ dashboardId: '123' });
```

Note, in this process you lose the location state object, which effectively
makes the final destination incorrect, if the app makes use of the location
state object.

For more ways working with locators see the `LocatorPublic` interface.

## Short URLs

