- Start Date: 2019-05-10
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

A front-end service to manage registration and root-level routing for
first-class applications.

# Basic example


```tsx
// my_plugin/public/application.js

import React from 'react';
import ReactDOM from 'react-dom';

import { MyApp } from './componnets';

export function renderApp(context, { element }) {
  ReactDOM.render(
    <MyApp mountContext={context} deps={pluginStart} />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
```

```tsx
// my_plugin/public/plugin.js

class MyPlugin {
  setup({ application }) {
    application.register({
      id: 'my-app',
      title: 'My Application',
      async mount(context, params) {
        const { renderApp } = await import('./application');
        return renderApp(context, params);
      }
    });
  }
}
```

# Motivation

By having centralized management of applications we can have a true single page
application. It also gives us a single place to enforce authorization and/or
licensing constraints on application access.

By making the mounting interface of the ApplicationService generic, we can
support many different rendering technologies simultaneously to avoid framework
lock-in.

# Detailed design

## Interface

```ts
/** A context type that implements the Handler Context pattern from RFC-0003 */
export interface AppMountContext {
  /** These services serve as an example, but are subject to change. */
  core: {
    http: {
      fetch(...): Promise<any>;
    };
    i18n: {
      translate(
        id: string,
        defaultMessage: string,
        values?: Record<string, string>
      ): string;
    };
    notifications: {
      toasts: {
        add(...): void;
      };
    };
    overlays: {
      showFlyout(render: (domElement) => () => void): Flyout;
      showModal(render: (domElement) => () => void): Modal;
    };
    uiSettings: { ... };
  };
  /** Other plugins can inject context by registering additional context providers */
  [contextName: string]: unknown;
}

export interface AppMountParams {
  /** The base path the application is mounted on. Used to configure routers. */
  appBasePath: string;
  /** The element the application should render into */
  element: HTMLElement;
}

export type Unmount = () => Promise<void> | void;

export interface AppSpec {
  /**
   * A unique identifier for this application. Used to build the route for this
   * application in the browser.
   */
  id: string;

  /**
   * The title of the application.
   */
  title: string;

  /**
   * A mount function called when the user navigates to this app's route.
   * @param context the `AppMountContext` generated for this app
   * @param params the `AppMountParams`
   * @returns An unmounting function that will be called to unmount the application.
   */
  mount(context: MountContext, params: AppMountParams): Unmount | Promise<Unmount>;

  /**
   * A EUI iconType that will be used for the app's icon. This icon
   * takes precendence over the `icon` property.
   */
  euiIconType?: string;

  /**
   * A URL to an image file used as an icon. Used as a fallback
   * if `euiIconType` is not provided.
   */
  icon?: string;

  /**
   * Custom capabilities defined by the app.
   */
  capabilities?: Partial<Capabilities>;
}

export interface ApplicationSetup {
  /**
   * Registers an application with the system.
   */
  register(app: AppSpec): void;
  registerMountContext<T extends keyof MountContext>(
    contextName: T,
    provider: (context: Partial<MountContext>) => MountContext[T] | Promise<MountContext[T]>
  ): void;
}

export interface ApplicationStart {
  /**
   * The UI capabilities for the current user.
   */
  capabilities: Capabilties;
}
```

## Mounting

When an app is registered via `register`, it must provide a `mount` function
that will be invoked whenever the window's location has changed from another app
to this app.

This function is called with a `AppMountContext` and an
`AppMountParams` which contains a `HTMLElement` for the application to
render itself to. The mount function must also return a function that can be
called by the ApplicationService to unmount the application at the given DOM
Element. The mount function may return a Promise of an unmount function in order
to import UI code dynamically.

The ApplicationService's `register` method will only be available during the
*setup* lifecycle event. This allows the system to know when all applications
have been registered.

The `mount` function will also get access to the `AppMountContext` that
has many of the same core services available during the `start` lifecycle.
Plugins can also register additional context attributes via the
`registerMountContext` function.

## Routing

The ApplicationService will serve as the global frontend router for Kibana,
enabling Kibana to be a 100% single page application. However, the router will
only manage top-level routes. Applications themselves will need to implement
their own routing as subroutes of the top-level route.

An example:
- "MyApp" is registered with `id: 'my-app'`
- User navigates from mykibana.com/app/home to mykibana.com/app/my-app
- ApplicationService sees the root app has changed and mounts the new
  application:
  - Calls the `Unmount` function returned my "Home"'s `mount`
  - Calls the `mount` function registered by "MyApp"
- MyApp's internal router takes over rest of routing. Redirects to initial
  "overview" page: mykibana.com/app/my-app/overview

When setting up a router, your application should only handle the part of the
URL following the `params.appBasePath` provided when you application is mounted.

### Legacy Applications

In order to introduce this service now, the ApplicationService will need to be
able to handle "routing" to legacy applications. We will not be able to run
multiple legacy applications on the same page load due to shared stateful
modules in `ui/public`.

Instead, the ApplicationService should do a full-page refresh when rendering
legacy applications. Internally, this will be managed by registering legacy apps
with the ApplicationService separately and handling those top-level routes by
starting a full-page refresh rather than a mounting cycle.

## Complete Example

Here is a complete example that demonstrates rendering a React application with
a full-featured router and code-splitting. Note that using React or any other
3rd party tools featured here is not required to build a Kibana Application.

```tsx
// my_plugin/public/application.tsx

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom';
import loadable from '@loadable/component';

// Apps can choose to load components statically in the same bundle or
// dynamically when routes are rendered.
import { HomePage } from './pages';
const LazyDashboard = loadable(() => import('./pages/dashboard'));

const MyApp = ({ basename }) => (
  // Setup router's basename from the basename provided from MountContext
  <BrowserRouter basename={basename}>

    {/* mykibana.com/app/my-app/ */}
    <Route path="/" exact component={HomePage} />

    {/* mykibana.com/app/my-app/dashboard/42 */}
    <Route
      path="/dashboard/:id"
      render={({ match }) => <LazyDashboard dashboardId={match.params.id} />}
    />

  </BrowserRouter>,
);

export function renderApp(context, params) {
  ReactDOM.render(
    // `params.appBasePath` would be `/app/my-app` in this example.
    // This exact string is not guaranteed to be stable, always reference the
    // provided value at `params.appBasePath`.
    <MyApp basename={params.appBasePath} />,
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
}
```

```tsx
// my_plugin/public/plugin.tsx

export class MyPlugin {
  setup({ application }) {
    application.register({
      id: 'my-app',
      async mount(context, params) {
        const { renderApp } = await import('./application');
        return renderApp(context, params);
      }
    });
  }
}
```

## Core Entry Point

Once we can support application routing for new and legacy applications, we
should create a new entry point bundle that only includes Core and any necessary
uiExports (hacks for example). This should be served by the backend whenever a
`/app/<app-id>` request is received for an app that the legacy platform does not
have a bundle for.

# Drawbacks

- Implementing this will be significant work and requires migrating legacy code
  from `ui/chrome`
- Making Kibana a single page application may lead to problems if applications
  do not clean themselves up properly when unmounted
- Application `mount` functions will have access to *setup* via the closure. We
  may want to lock down these APIs from being used after *setup* to encourage
  usage of the `MountContext` instead.
- In order to support new applications being registered in the legacy platform,
  we will need to create a new `uiExport` that is imported during the new
  platform's *setup* lifecycle event. This is necessary because app registration
  must happen prior to starting the legacy platform. This is only an issue for
  plugins that are migrating using a shim in the legacy platform.

# Alternatives

- We could provide a full featured react-router instance that plugins could
  plug directly into. The downside is this locks us more into React and makes
  code splitting a bit more challenging.

# Adoption strategy

Adoption of the application service will have to happen as part of the migration
of each plugin. We should be able to support legacy plugins registering new
platform-style applications before they actually move all of their code
over to the new platform.

# How we teach this

Introducing this service makes applications a first-class feature of the Kibana
platform. Right now, plugins manage their own routes and can export "navlinks"
that get rendered in the navigation UI, however there is a not a self-contained
concept like an application to encapsulate these related responsibilities. It
will need to be emphasized that plugins can register zero, one, or multiple
applications.

Most new and existing Kibana developers will need to understand how the
ApplicationService works and how multiple apps run in a single page application.
This should be accomplished through thorough documentation in the
ApplicationService's API implementation as well as in general plugin development
tutorials and documentation.

# Unresolved questions

- Are there any major caveats to having multiple routers on the page? If so, how
can these be prevented or worked around?
- How should global URL state be shared across applications, such as timepicker
state?
