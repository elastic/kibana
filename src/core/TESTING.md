# Testing Kibana Plugins

This document outlines best practices and patterns for testing Kibana Plugins.

- [Strategy](#strategy)
- [Core Integrations](#core-integrations)
  - [Core Mocks](#core-mocks)
  - [Strategies for specific Core APIs](#strategies-for-specific-core-apis)
      - [HTTP Routes](#http-routes)
      - [SavedObjects](#savedobjects)
      - [Elasticsearch](#elasticsearch)
- [Plugin Integrations](#plugin-integrations)
- [Plugin Contracts](#plugin-contracts)

## Strategy

In general, we recommend three tiers of tests:
- Unit tests: small, fast, exhaustive, make heavy use of mocks for external dependencies 
- Integration tests: higher-level tests that verify interactions between systems (eg. HTTP APIs, Elasticsearch API calls, calling other plugin contracts).
- End-to-end tests (e2e): tests that verify user-facing behavior through the browser

These tiers should roughly follow the traditional ["testing pyramid"](https://martinfowler.com/articles/practical-test-pyramid.html), where there are more exhaustive testing at the unit level, fewer at the integration level, and very few at the functional level. 

## New concerns in the Kibana Platform

The Kibana Platform introduces new concepts that legacy plugins did not have concern themselves with. Namely:
- **Lifecycles**: plugins now have explicit lifecycle methods that must interop with Core APIs and other plugins.
- **Shared runtime**: plugins now all run in the same process at the same time. On the frontend, this is different behavior than the legacy plugins. Developers should take care not to break other plugins when interacting with their enviornment (Node.js or Browser).
- **Single page application**: Kibana's frontend is now a single-page application where all plugins are running, but only one application is mounted at a time. Plugins need to handle mounting and unmounting, cleanup, and avoid overriding global browser behaviors in this shared space.
- **Dependency management**: plugins must now explicitly declare their dependencies on other plugins, both required and optional. Plugins should ensure to test conditions where a optional dependency is missing.

Simply porting over existing tests when migrating your plugin to the Kibana Platform will leave blind spots in test coverage. It is highly recommended that plugins add new tests that cover these new concerns.

## Core Integrations

### Core Mocks

When testing a plugin's integration points with Core APIs, it is heavily recommended to utilize the mocks provided in `src/core/server/mocks` and `src/core/public/mocks`. The majority of these mocks are dumb `jest` mocks that mimic the interface of their respective Core APIs, however they do not return realistic return values.

If the unit under test expects a particular response from a Core API, the test will need to set this return value explicitly. The return values are type checked to match the Core API where possible to ensure that mocks are updated when Core APIs changed.

#### Example

```ts
import { elasticsearchServiceMock } from 'src/core/server/mocks';

test('my test', async () => {
  // Setup mock and faked response
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  esClient.callAsCurrentUser.mockResolvedValue(/** insert ES response here */);

  // Call unit under test with mocked client
  const result = await myFunction(esClient);

  // Assert that client was called with expected arguments
  expect(esClient.callAsCurrentUser).toHaveBeenCalledWith(/** expected args */);
  // Expect that unit under test returns expected value based on client's response
  expect(result).toEqual(/** expected return value */)
});
```

### Strategies for specific Core APIs

#### HTTP Routes

_How to test route handlers_

### Applications

Kibana Platform applications have less control over the page than legacy applications did. It is important that your app is built to handle it's co-habitance with other plugins in the browser. Applications are mounted and unmounted from the DOM as the user navigates between them, without full-page refreshes, as a single-page application (SPA). 

These long-lived sessions make cleanup more important than before. It's entirely possible a user has a single browsing session open for weeks at a time, without ever doing a full-page refresh. Common things that need to be cleaned up (and tested!) when your application is unmounted:
- Subscriptions and polling (eg. `uiSettings.get$()`)
- Any Core API calls that set state (eg. `core.chrome.setIsVisible`).
- Open connections (eg. a Websocket)

While applications do get an opportunity to unmount and run cleanup logic, it is also important that you do not _depend_ on this logic to run. The browser tab may get closed without running cleanup logic, so it is not guaranteed to be run. For instance, you should not depend on unmounting logic to run in order to save state to `localStorage` or to the backend.

#### Example

By following the [renderApp](./CONVENTIONS.md#applications) convention, you can greatly reduce the amount of logic in your application's mount function. This makes testing your application's actual rendering logic easier.

```tsx
/** public/plugin.ts */
class Plugin {
  setup(core) {
    core.application.register({
      // id, title, etc.
      async mount(params) {
        const [{ renderApp }, [coreStart, startDeps]] = await Promise.all([
          import('./application'),
          core.getStartServices()
        ]);

        return renderApp(params, coreStart, startDeps);
      }
    })
  }
}
```

We _could_ still write tests for this logic, but you may find that you're just asserting the same things that would be covered by type-checks.

<details>
<summary>See example</summary>

```ts
/** public/plugin.test.ts */
jest.mock('./application', () => ({ renderApp: jest.fn() }));
import { coreMock } from 'src/core/public/mocks';
import { renderApp: renderAppMock } from './application';
import { Plugin } from './plugin';

describe('Plugin', () => {
  it('registers an app', () => {
    const coreSetup = coreMock.createSetup();
    new Plugin(coreMock.createPluginInitializerContext()).setup(coreSetup);
    expect(coreSetup.application.register).toHaveBeenCalledWith({
      id: 'myApp',
      mount: expect.any(Function)
    });
  });

  // Test the glue code from Plugin -> renderApp
  it('application.mount wires up dependencies to renderApp', async () => {
    const coreSetup = coreMock.createSetup();
    const [coreStartMock, startDepsMock] = await coreSetup.getStartServices();
    const unmountMock = jest.fn();
    renderAppMock.mockReturnValue(unmountMock);
    const params = { element: document.createElement('div'), appBasePath: '/fake/base/path' };

    new Plugin(coreMock.createPluginInitializerContext()).setup(coreSetup);
    // Grab registered mount function
    const mount = coreSetup.application.register.mock.calls[0][0].mount;

    const unmount = await mount(params);
    expect(renderAppMock).toHaveBeenCalledWith(params, coreStartMock, startDepsMock);
    expect(unmount).toBe(unmountMock);
  });
});
```

</details>

The more interesting logic is in `renderApp`:

```ts
/** public/application.ts */
import React from 'react';
import ReactDOM from 'react-dom';

import { AppMountParams, CoreStart } from 'src/core/public';
import { AppRoot } from './components/app_root';

export const renderApp = ({ element, appBasePath }: AppMountParams, core: CoreStart, plugins: MyPluginDepsStart) => {
  // Hide the chrome while this app is mounted for a full screen experience
  core.chrome.setIsVisible(false);

  // uiSettings subscription
  const uiSettingsClient = core.uiSettings.client;
  const pollingSubscription = uiSettingClient.get$('mysetting1').subscribe(async mySetting1 => {
    const value = core.http.fetch(/** use `mySetting1` in request **/);
    // ...
  });

  // Render app
  ReactDOM.render(
    <AppRoot routerBasePath={appBasePath} core={core} plugins={plugins} />,
    element
  );

  return () => {
    // Unmount UI
    ReactDOM.unmountComponentAtNode(element);
    // Close any subscriptions
    pollingSubscription.unsubscribe();
    // Make chrome visible again
    core.chrome.setIsVisible(true);
  };
};
```

In testing `renderApp` you should be verifying that:
1) Your application mounts and unmounts correctly
2) Cleanup logic is completed as expected

```ts
/** public/application.test.ts */
import { coreMock } from 'src/core/public/mocks';
import { renderApp } from './application';

describe('renderApp', () => {
  it('mounts and unmounts UI', () => {
    const params = { element: document.createElement('div'), appBasePath: '/fake/base/path' };
    const core = coreMock.createStart();

    // Verify some expected DOM element is rendered into the element
    const unmount = renderApp(params, core, {});
    expect(params.element.querySelector('.some-app-class')).not.toBeUndefined();
    // Verify the element is empty after unmounting
    unmount();
    expect(params.element.innerHTML).toEqual('');
  });

  it('unsubscribes from uiSettings', () => {
    const params = { element: document.createElement('div'), appBasePath: '/fake/base/path' };
    const core = coreMock.createStart();
    // Create a fake Subject you can use to monitor observers
    const settings$ = new Subject();
    core.uiSettings.get$.mockReturnValue(settings$);

    // Verify mounting adds an observer
    const unmount = renderApp(params, core, {});
    expect(settings$.observers.length).toBe(1);
    // Verify no observers remaining after unmount is called
    unmount();
    expect(settings$.observers.length).toBe(0);
  });

  it('resets chrome visibility', () => {
    const params = { element: document.createElement('div'), appBasePath: '/fake/base/path' };
    const core = coreMock.createStart();

    // Verify stateful Core API was called on mount
    const unmount = renderApp(params, core, {});
    expect(core.chrome.setIsVisible).toHaveBeenCalledWith(false);
    core.chrome.setIsVisible.mockClear(); // reset mock
    // Verify stateful Core API was called on unmount
    unmount();
    expect(core.chrome.setIsVisible).toHaveBeenCalledWith(true);
  })
});
```

#### SavedObjects

_How to test SO operations_

#### Elasticsearch

_How to test ES clients_

## Plugin Integrations

_How to test against specific plugin APIs (eg. data plugin)_

## Plugin Contracts

_How to test your plugin's exposed API_

Guidelines:
- Plugins should never interact with other plugins' REST API directly
- Plugins should interact with other plugins via JavaScript contracts
- Exposed contracts need to be well tested to ensure breaking changes are detected easily
