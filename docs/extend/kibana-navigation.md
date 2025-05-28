---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/kibana-navigation.html
---

# Routing, Navigation and URL [kibana-navigation]

The {{kib}} platform provides a set of tools to help developers build consistent experience around routing and browser navigation. Some of that tooling is inside `core`, some is available as part of various plugins.

The purpose of this guide is to give a high-level overview of available tools and to explain common approaches for handling routing and browser navigation.

This guide covers following topics:

* [Deep-linking into {{kib}} apps](#deep-linking)
* [Navigating between {{kib}} apps](#navigating-between-kibana-apps)
* [Setting up internal app routing](#routing)
* [Using history and browser location](#history-and-location)
* [Syncing state with URL](#state-sync)
* [Preserving state between navigations](#preserve-state)

## Deep-linking into {{kib}} apps [deep-linking]

Assuming you want to link from your app to **Discover**. When building such URL there are two things to consider:

1. Prepending a proper `basePath`.
2. Specifying **Discover** state.

### Prepending a proper `basePath` [_prepending_a_proper_basepath]

To prepend {{kib}}'s `basePath` use [core.http.basePath.prepend](https://github.com/elastic/kibana/tree/master/src/core/packages/http/browser-internal/src/base_path.ts) helper:

```typescript
const discoverUrl = core.http.basePath.prepend(`/discover`);

console.log(discoverUrl); // http://localhost:5601/bpr/s/space/app/discover
```


### Specifying state [_specifying_state]

**Consider a {{kib}} app URL a part of app’s plugin contract:**

1. Avoid hardcoding other app’s URL in your app’s code.
2. Avoid generating other app’s state and serializing it into URL query params.

```typescript
// Avoid relying on other app's state structure in your app's code:
const discoverUrlWithSomeState = core.http.basePath.prepend(`/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'2020-09-10T11:39:50.203Z',to:'2020-09-10T11:40:20.249Z'))&_a=(columns:!(_source),filters:!(),index:'90943e30-9a47-11e8-b64d-95841ca0b247',interval:auto,query:(language:kuery,query:''),sort:!())`);
```

Instead, each app should expose [a locator](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/share/common/url_service/locators/README.md). Other apps should use those locators for navigation or URL creation.

```typescript
// Properly generated URL to *Discover* app. Locator code is owned by *Discover* app and available on *Discover*'s plugin contract.
const discoverUrl = await plugins.discover.locator.getUrl({filters, timeRange});
// or directly execute navigation
await plugins.discover.locator.navigate({filters, timeRange});
```

To get a better idea, take a look at **Discover** locator [implementation](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/discover/public/application/doc/locator.ts). It allows specifying various **Discover** app state pieces like: index pattern, filters, query, time range and more.

There are two ways to access locators of other apps:

1. From a plugin contract of a destination app **(preferred)**.
2. Using locator client in `share` plugin (case an explicit plugin dependency is not possible).

In case you want other apps to link to your app, then you should create a locator and expose it on your plugin’s contract.



## Navigating between {{kib}} apps [navigating-between-kibana-apps]

{{kib}} is a single page application and there is a set of simple rules developers should follow to make sure there is no page reload when navigating from one place in {{kib}} to another.

For example, navigation using native browser APIs would cause a full page reload.

```js
const urlToADashboard = core.http.basePath.prepend(`/dashboard/my-dashboard`);

// this would cause a full page reload:
window.location.href = urlToADashboard;
```

To navigate between different {{kib}} apps without a page reload (by default) there are APIs in `core`:

* [core.application.navigateToApp](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/contracts.ts)
* [core.application.navigateToUrl](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/contracts.ts)

Both methods offer customization such as opening the target in a new page, with an `options` parameter. All the options are optional be default.

* [core.application.navigateToApp options](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/contracts.ts)
* [core.application.navigateToUrl options](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/contracts.ts)

**Rendering a link to a different {{kib}} app on its own would also cause a full page reload:**

```typescript
const myLink = () =>
  <a href={urlToADashboard}>Go to Dashboard</a>;
```

A workaround could be to handle a click, prevent browser navigation and use `core.application.navigateToApp` API:

```typescript
const MySPALink = () =>
  <a
    href={urlToADashboard}
    onClick={(e) => {
      e.preventDefault();
      core.application.navigateToApp('dashboard', { path: '/my-dashboard' });
    }}
  >
    Go to Dashboard
  </a>;
```

As it would be too much boilerplate to do this for each {{kib}} link in your app, there is a handy wrapper that helps with it: [RedirectAppLinks](https://github.com/elastic/kibana/tree/master/src/platform/packages/shared/shared-ux/link/redirect_app/impl/src/redirect_app_links.tsx).

```typescript
const MyApp = () =>
  <RedirectAppLinks coreStart={{application: core.application}}>
    {/*...*/}
    {/* navigations using this link will happen in SPA friendly way */}
      <a href={urlToADashboard}>Go to Dashboard</a>
    {/*...*/}
  </RedirectAppLinks>
```

::::{note}
There may be cases where you need a full page reload. While rare and should be avoided, rather than implement your own navigation, you can use the `navigateToUrl` `forceRedirect` option.
::::


```typescript
const MyForcedPageReloadLink = () =>
  <a
    href={urlToSomeSpecialApp}
    onClick={(e) => {
      e.preventDefault();
      core.application.navigateToUrl('someSpecialApp', { forceRedirect: true });
    }}
  >
    Go to Some Special App
  </a>;
```

If you also need to bypass the default onAppLeave behavior, you can set the `skipUnload` option to `true`. This option is also available in `navigateToApp`.


## Setting up internal app routing [routing]

It is very common for {{kib}} apps to use React and React Router. Common rules to follow in this scenario:

* Set up `BrowserRouter` and not `HashRouter`.
* **Initialize your router with `history` instance provided by the `core`.**

This is required to make sure `core` is aware of navigations triggered inside your app, so it could act accordingly when needed.

* `Core`'s [ScopedHistory](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/scoped_history.ts) instance.
* [Example usage](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/app_mount.ts)
* [Example plugin](https://github.com/elastic/kibana/tree/master/test/plugin_functional/plugins/core_plugin_a/public/application.tsx#L120)

Relative links will be resolved relative to your app’s route (e.g.: `http://localhost5601/app/{{your-app-id}}`) and setting up internal links in your app in SPA friendly way would look something like:

```typescript
import {Link} from 'react-router-dom';

const MyInternalLink = () => <Link to="/my-other-page"></Link>
```


## Using history and browser location [history-and-location]

Try to avoid using `window.location` and `window.history` directly.<br> Instead, consider using [ScopedHistory](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/scoped_history.ts) instance provided by `core`.

* This way `core` will know about location changes triggered within your app, and it would act accordingly.
* Some plugins are listening to location changes. Triggering location change manually could lead to unpredictable and hard-to-catch bugs.

Common use-case for using `core`'s [ScopedHistory](https://github.com/elastic/kibana/tree/master/src/core/packages/application/browser/src/scoped_history.ts) directly:

* Reading/writing query params or hash.
* Imperatively triggering internal navigations within your app.
* Listening to browser location changes.


## Syncing state with URL [state-sync]

Historically {{kib}} apps store *a lot* of application state in the URL. The most common pattern that {{kib}} apps follow today is storing state in `_a` and `_g` query params in [rison](https://github.com/w33ble/rison-node#readme) format.

$$$query-params$$$
Those query params follow the convention:

* `_g` (**global**) - global UI state that should be shared and synced across multiple apps. common example from Analyze group apps: time range, refresh interval, **pinned** filters.
* `_a` (**application**) - UI state scoped to current app.

::::{note}
After migrating to KP platform we got navigations without page reloads. Since then there is no real need to follow `_g` and `_a` separation anymore. It’s up you to decide if you want to follow this pattern or if you prefer a single query param or something else. The need for this separation earlier is explained in [Preserving state between navigations](#preserve-state).
::::


There are utils to help you to implement such kind of state syncing.

**When you should consider using state syncing utils:**

* You want to sync your application state with URL in similar manner Analyze group applications do.
* You want to follow platform’s [working with browser history and location best practices](#history-and-location) out of the box.
* You want to support `state:storeInSessionStore` escape hatch for URL overflowing out of the box.
* You should also consider using them if you’d like to serialize state to different (not `rison`) format. Utils are composable, and you can implement your own `storage`.
* In case you want to sync part of your state with URL, but other part of it with browser storage.

**When you shouldn’t use state syncing utils:**

* Adding a query param flag or simple key/value to the URL.

Follow [these](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/kibana_utils/docs/state_sync#state-syncing-utilities) docs to learn more.


## Preserving state between navigations [preserve-state]

Consider the scenario:

1. You are in **Dashboard** app looking at a dashboard with some filters applied;
2. Navigate to **Discover** using in-app navigation;
3. Change the time filter'
4. Navigate to **Dashboard** using in-app navigation.

You’d notice that you were navigated to **Dashboard** app with the **same state** that you left it with, except that the time filter has changed to the one you applied on **Discover** app.

Historically {{kib}} Analyze groups apps achieve that behavior relying on state in the URL. If you’d have a closer look on a link in the navigation, you’d notice that state is stored inside that link, and it also gets updated whenever relevant state changes happen:

![State is stored inside the navigation link](images/state_inside_the_link.png "")

This is where [separation](#query-params) into `_a` and `_g` query params comes into play. What is considered a **global** state gets constantly updated in those navigation links. In the example above it was a time filter. This is backed by [KbnUrlTracker](https://github.com/elastic/kibana/tree/master/src/platform/plugins/shared/kibana_utils/public/state_management/url/kbn_url_tracker.ts#L57) util. You can use it to achieve similar behavior.

::::{note}
After migrating to KP navigation works without page reloads and all plugins are loaded simultaneously. Hence, likely there are simpler ways to preserve state of your application, unless you want to do it through URL.
::::
