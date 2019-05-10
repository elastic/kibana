- Start Date: 2019-05-10
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

A front-end service to manage registration and root-level routing for
first-class applications.

# Basic example

```tsx
import React from 'react';
import ReactDOM from 'react-dom';

import { MyApp } from './components';

class MyPlugin {
  setup({ application }) {
    application.registerApp({
      id: 'my-app',
      title: 'My Application',
      rootRoute: '/myapp',
      mount(targetDomElement, pluginStartContext, pluginStart) {
        ReactDOM.render(
          <MyAppRoot core={pluginStartContext} deps={pluginStart} />,
          targetDomElement
        );

        return () => {
          ReactDOM.unmountComponentAtNode(targetDomElement);
        };
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

This is the bulk of the RFC. Explain the design in enough detail for somebody
familiar with Kibana to understand, and for somebody familiar with the
implementation to implement. This should get into specifics and corner-cases,
and include examples of how the feature is used. Any new terminology should be
defined here.

## Interface

```ts
export type Unmount = () => void;

export interface AppSpec {
  id: string;

  /**
   * The title of the application.
   */
  title: string;

  /**
   * The root route to mount this application at. Must be unique across all
   * registered applications.
   */
  rootRoute: string;

  /**
   * A mount function called when the user navigates to this app's `rootRoute`.
   * @param targetDomElement An HTMLElement to mount the application onto.
   * @returns An unmounting function that will be called to unmount the application.
   */
  mount(targetDomElement: HTMLElement): Unmount

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
  registerApp(app: AppSpec): void;
}

export interface ApplicationStart {
  /**
   * The UI capabilities for the current user.
   */
  capabilities: Capabilties;
}
```

## Mounting

When an app is registered via `registerApp`, it must provide a `mount` function
that will be invoked whenever the window's location has changed from another app
to this app.

This function is called with an `HTMLELement` for the application
to render itself to. The application must also return a function that can be
called by the ApplicationService to unmount the application at the given DOM
node.

The ApplicationService's `registerApp` method will only be available during the
*setup* lifecycle event. This allows the system to know when all applications
have been registered.

However, the `mount` function will also get access to the `PluginStartContext`
that is normally provided during the *start* lifecycle event, as well as the
*start* contracts for any plugin dependencies. (Note: applications can only be
mounted during *start*).

## Routing

The ApplicationService will serve as the global frontend router for Kibana,
enabling Kibana to be a 100% single page application. However, the router will
only manage top-level routes. Applications themselves will need to implement
their own routing as subroutes of the top-level route.

An example:
- "MyApp" is registered with `rootRoute: '/myApp'`
- User navigates from mykibana.com/app/home to mykibana.com/app/myApp
- ApplicationService sees the root app has changed and mounts the new
  application:
  - Calls the `Unmount` function returned my "Home"'s `mount`
  - Calls the `mount` function registered by "MyApp"
- MyApp's internal router takes over rest of routing. Redirects to initial
  "overview" page: mykibana.com/app/myApp/overview

### Legacy Applications

In order to introduce this service now, the ApplicationService will need to be
able to handle "routing" to legacy applications. We will not be able to run
multiple legacy applications on the same page load due to shared stateful
modules in `ui/public`.

Instead, the ApplicationService should do a full-page refresh when rendering
legacy applications. Internally, this will be managed by registering legacy apps
with the ApplicationService separately and handling those top-level routes by
starting a full-page refresh rather than a mounting cycle.

## Bundling

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
- Application `mount` functions will have access to *setup* and *start* core
  services and plugins simultaneously.
- In order to support new applications being registered in the legacy platform,
  we will need to create a new `uiExport` that is imported during the new
  platform's *setup* lifecycle event. This is necessary because app registration
  must happen prior to starting the legacy platform. This is only an issue for
  plugins that are migrating using a shim in the legacy platform.

# Alternatives

To prevent applications from having access to *setup* and *start* simultaneously
we could restrict `mount` having access to `setup` via the closure, with either:
- Register import promises instead of mount functions. The ApplicationService
  could then import the module dynamically and call it's exported `mount`
  function. Example:
  ```ts
  // my_plugin/index.ts
  class MyPlugin {
    setup({ application }) {
      application.registerApp({
        id: '...',
        mountModule: import('./mount_app')
      });
    }
  }
  
  // my_plugin/mount_app.ts
  export const mount = (targetDomElement, pluginStartContext, pluginStart) => {
    ReactDOM.render(...);
    return () => ReactDOM.unmountComponentAtNode(...);
  };
  ```
- Require plugins to register applications in *setup* and their corresponding
  `mount` functions in *start*. Example:
  ```ts
  // my_plugin/index.ts
  class MyPlugin {
    setup({ application }) {
      this.myApp = application.registerApp({
        id: '...',
      });
    }

    start() {
      this.myApp.setMounter((targetDomElement) => {
        ReactDOM.render(...)
        return () => ReactDOM.unmountComponentAtNode(...);
      })
    }
  }
  ```


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
