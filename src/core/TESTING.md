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

```typescript
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

## Strategies for specific Core APIs

### HTTP Routes
The HTTP API interface is another public contract of Kibana, although not every Kibana endpoint is for external use. When evaluating the required level of test coverage for an HTTP resource, make your judgment based on whether an endpoint is considered to be public or private. Public API is expected to have a higher level of test coverage.
Public API tests should cover the **observable behavior** of the system, therefore they should be close to the real user interactions as much as possible, ideally by using HTTP requests to communicate with the Kibana server as a real user would do.

##### Preconditions
We are going to add tests for `myPlugin` plugin that allows to format user-provided text, store and retrieve it later.
The plugin has *thin* route controllers isolating all the network layer dependencies and delegating all the logic to the plugin model.

```typescript
class TextFormatter {
  public static async format(text: string, sanitizer: Deps['sanitizer']) {
    // sanitizer.sanitize throws MisformedTextError when passed text contains HTML markup
    const sanitizedText = await sanitizer.sanitize(text); 
    return sanitizedText;
  }

  public static async save(text: string, savedObjectsClient: SavedObjectsClient) {
    const { id } = await savedObjectsClient.update('myPlugin-type', 'myPlugin', {
      userText: text
    });
    return { id };
  }

  public static async getById(id: string, savedObjectsClient: SavedObjectsClient) {
    const { attributes } = await savedObjectsClient.get('myPlugin-type', id);
    return { text: attributes.userText };
  }
}
router.get(
  {
    path: '/myPlugin/formatter',
    validate: {
      query: schema.object({
        text: schema.string({ maxLength: 100 }),
      }),
    },
  },
  async (context, request, response) => {
    try {
      const formattedText = await TextFormatter.format(request.query.text, deps.sanitizer);
      return response.ok({ body: formattedText });
    } catch(error) {
      if (error instanceof MisformedTextError) {
        return response.badRequest({ body: error.message })
      }

      throw e;
    }
  }
);
router.post(
  {
    path: '/myPlugin/formatter/text',
    validate: {
      body: schema.object({
        text: schema.string({ maxLength: 100 }),
      }),
    },
  },
  async (context, request, response) => {
    try {
      const { id } = await TextFormatter.save(request.query.text, context.core.savedObjects.client);
      return response.ok({ body: { id } });
    } catch(error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        return response.conflict({ body: error.message })
      }
      throw e;
    }
  }
);

router.get(
  {
    path: '/myPlugin/formatter/text/{id}',
    validate: {
      params: schema.object({
        id: schema.string(),
      }),
    },
  },
  async (context, request, response) => {
    try {
      const { text } = await TextFormatter.getById(request.params.id, context.core.savedObjects.client);
      return response.ok({
        body: text
      });
    } catch(error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return response.notFound()
      }
      throw e;
    }
  }
);
```

#### Unit testing
Unit tests provide the simplest and fastest way to test the logic in your route controllers and plugin models. 
Use them whenever adding an integration test is hard and slow due to complex setup or the number of logic permutations.
Since all external core and plugin dependencies are mocked, you don't have the guarantee that the whole system works as
expected.
Pros:
- fast
- easier to debug

Cons:
- doesn't test against real dependencies
- doesn't cover integration with other plugins

###### Example
You can leverage existing unit-test infrastructure for this. You should add `*.test.ts` file and use dependencies mocks to cover the functionality with a broader test suit that covers:
- input permutations
- input edge cases
- expected exception
- interaction with dependencies
```typescript
// src/plugins/my_plugin/server/formatter.test.ts
describe('TextFormatter', () => {
  describe('format()', () => {
    const sanitizer = sanitizerMock.createSetup();
    sanitizer.sanitize.mockImplementation((input: string) => `sanitizer result:${input}`);

    it('formats text to a ... format', async () => {
      expect(await TextFormatter.format('aaa', sanitizer)).toBe('...');
    });

    it('calls Sanitizer.sanitize with correct arguments', async () => {
      await TextFormatter.format('aaa', sanitizer);
      expect(sanitizer.sanitize).toHaveBeenCalledTimes(1);
      expect(sanitizer.sanitize).toHaveBeenCalledWith('aaa');
    });

    it('throws MisformedTextError if passed string contains banned symbols', async () => {
      sanitizer.sanitize.mockRejectedValueOnce(new MisformedTextError());
      await expect(TextFormatter.format('any', sanitizer)).rejects.toThrow(MisformedTextError);
    });
    // ... other tests
  });
});
```

#### Integration tests
Depending on the number of external dependencies, you can consider implementing several high-level integration tests. 
They would work as a set of [smoke tests](https://en.wikipedia.org/wiki/Smoke_testing_(software)) for the most important functionality.
Main subjects for tests should be:
- authenticated / unauthenticated access to an endpoint.
- endpoint validation (params, query, body).
- main business logic.
- dependencies on other plugins.

##### Functional Test Runner
If your plugin relies on the elasticsearch server to store data and supports additional configuration, you can leverage the Functional Test Runner(FTR) to implement integration tests. 
FTR bootstraps an elasticsearch and a Kibana instance and runs the test suite against it.
Pros:
- runs the whole Elastic stack
- tests cross-plugin integration
- emulates a real user interaction with the stack
- allows adjusting config values

Cons:
- slow start
- hard to debug
- brittle tests

###### Example
You can reuse existing [api_integration](/test/api_integration/config.js) setup by registering a test file within a [test loader](/test/api_integration/apis/index.js). More about the existing FTR setup in the [contribution guide](/CONTRIBUTING.md#running-specific-kibana-tests)

The tests cover:
- authenticated / non-authenticated user access (when applicable)
```typescript
// TODO after https://github.com/elastic/kibana/pull/53208/
```
- request validation
```typescript
// test/api_integration/apis/my_plugin/something.ts
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('myPlugin', () => {
    it('validate params before to store text', async () => {
      const response = await supertest
        .post('/myPlugin/formatter/text')
        .set('content-type', 'application/json')
        .send({ text: 'aaa'.repeat(100) })
        .expect(400);

      expect(response.body).to.have.property('message');
      expect(response.body.message).to.contain('must have a maximum length of [100]');
    });
  });
```
- the main logic of the plugin
```typescript
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('myPlugin', () => {
    it('stores text', async () => {
      const response = await supertest
        .post('/myPlugin/formatter/text')
        .set('content-type', 'application/json')
        .send({ text: 'aaa' })
        .expect(200);

      expect(response.body).to.have.property('id');
      expect(response.body.id).to.be.a('string');
    });

    it('retrieves text', async () => {
      const { body } = await supertest
        .post('/myPlugin/formatter/text')
        .set('content-type', 'application/json')
        .send({ text: 'bbb' })
        .expect(200);

      const response = await supertest.get(`/myPlugin/formatter/text/${body.id}`).expect(200);
      expect(response.text).be('bbb');
    });

    it('returns NotFound error when cannot find a text', async () => {
      await supertest
        .get('/myPlugin/something/missing')
        .expect(404, 'Saved object [myPlugin-type/missing] not found');
    });
  });
```

##### TestUtils
It can be utilized if your plugin doesn't interact with the elasticsearch server or mocks the own methods doing so.
Runs tests against real Kibana server instance.
Pros:
- runs the real Kibana instance
- tests cross-plugin integration
- emulates a real user interaction with the HTTP resources

Cons:
- faster than FTR because it doesn't run elasticsearch instance, but still slow
- hard to debug
- doesn't cover Kibana CLI logic

###### Example
To have access to Kibana TestUtils, you should create `integration_tests` folder and import `test_utils` within a test file:
```typescript
// src/plugins/my_plugin/server/integration_tests/formatter.test.ts
import * as kbnTestServer from 'src/test_utils/kbn_server';

describe('myPlugin', () => {
  describe('GET /myPlugin/formatter', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeAll(async () => {
      root = kbnTestServer.createRoot();
      await root.setup();
      await root.start();
    }, 30000);

    afterAll(async () => await root.shutdown());
    it('validates given text', async () => {
      const response = await kbnTestServer.request
        .get(root, '/myPlugin/formatter')
        .query({ text: 'input string'.repeat(100) })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('formats given text', async () => {
      const response = await kbnTestServer.request
        .get(root, '/myPlugin/formatter')
        .query({ text: 'input string' })
        .expect(200);

      expect(response.text).toBe('...');
    });

    it('returns BadRequest if passed string contains banned symbols', async () => {
      await kbnTestServer.request
        .get(root, '/myPlugin/formatter')
        .query({ text: '<script>' })
        .expect(400, 'Text cannot contain unescaped HTML markup.');
    });
  });
});
```
Sometimes we want to test a route controller logic and don't rely on the internal logic of the platform or a third-party plugin. 
Then we can apply a hybrid approach and mock the necessary method of `TextFormatter` model to test how `MisformedTextError`
handled in the route handler without calling `sanitizer` dependency directly.
```typescript
jest.mock('../path/to/model');
import { TextFormatter } from '../path/to/model';
import { MisformedTextError } from '../path/to/sanitizer'

describe('myPlugin', () => {
  describe('GET /myPlugin/formatter', () => {
    let root: ReturnType<typeof kbnTestServer.createRoot>;
    beforeAll(async () => {
      root = kbnTestServer.createRoot();
      await root.setup();
      await root.start();
    }, 30000);

    afterAll(async () => await root.shutdown());
    it('returns BadRequest if Sanitizer throws MisformedTextError', async () => {
      TextFormatter.format.mockRejectedValueOnce(new MisformedTextError());

      await kbnTestServer.request
        .get(root, '/myPlugin/formatter')
        .query({ text: 'any text' })
        .expect(400, 'bad bad request');
    });
  });
});
```

### Applications

Kibana Platform applications have less control over the page than legacy applications did. It is important that your app is built to handle it's co-habitance with other plugins in the browser. Applications are mounted and unmounted from the DOM as the user navigates between them, without full-page refreshes, as a single-page application (SPA). 

These long-lived sessions make cleanup more important than before. It's entirely possible a user has a single browsing session open for weeks at a time, without ever doing a full-page refresh. Common things that need to be cleaned up (and tested!) when your application is unmounted:
- Subscriptions and polling (eg. `uiSettings.get$()`)
- Any Core API calls that set state (eg. `core.chrome.setIsVisible`).
- Open connections (eg. a Websocket)

While applications do get an opportunity to unmount and run cleanup logic, it is also important that you do not _depend_ on this logic to run. The browser tab may get closed without running cleanup logic, so it is not guaranteed to be run. For instance, you should not depend on unmounting logic to run in order to save state to `localStorage` or to the backend.

#### Example

By following the [renderApp](./CONVENTIONS.md#applications) convention, you can greatly reduce the amount of logic in your application's mount function. This makes testing your application's actual rendering logic easier.

```typescript jsx
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

```typescript
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

```typescript
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

```typescript
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
