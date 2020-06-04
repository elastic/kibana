# Testing Kibana Plugins

This document outlines best practices and patterns for testing Kibana Plugins.

- [Testing Kibana Plugins](#testing-kibana-plugins)
  - [Strategy](#strategy)
  - [New concerns in the Kibana Platform](#new-concerns-in-the-kibana-platform)
  - [Core Integrations](#core-integrations)
    - [Core Mocks](#core-mocks)
      - [Example](#example)
  - [Strategies for specific Core APIs](#strategies-for-specific-core-apis)
    - [HTTP Routes](#http-routes)
        - [Preconditions](#preconditions)
      - [Unit testing](#unit-testing)
          - [Example](#example-1)
      - [Integration tests](#integration-tests)
        - [Functional Test Runner](#functional-test-runner)
          - [Example](#example-2)
        - [TestUtils](#testutils)
          - [Example](#example-3)
    - [Applications](#applications)
      - [Example](#example-4)
    - [SavedObjects](#savedobjects)
      - [Unit Tests](#unit-tests)
      - [Integration Tests](#integration-tests-1)
    - [Elasticsearch](#elasticsearch)
  - [Plugin integrations](#plugin-integrations)
    - [Preconditions](#preconditions-1)
    - [Testing dependencies usages](#testing-dependencies-usages)
    - [Testing components consuming the dependencies](#testing-components-consuming-the-dependencies)
    - [Testing optional plugin dependencies](#testing-optional-plugin-dependencies)

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
    const params = coreMock.createAppMountParamters('/fake/base/path');

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

import { AppMountParameters, CoreStart } from 'src/core/public';
import { AppRoot } from './components/app_root';

export const renderApp = (
  { element, history }: AppMountParameters,
  core: CoreStart,
  plugins: MyPluginDepsStart
) => {
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
    <AppRoot routerHistory={history} core={core} plugins={plugins} />,
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
import { createMemoryHistory } from 'history';
import { ScopedHistory } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';
import { renderApp } from './application';

describe('renderApp', () => {
  it('mounts and unmounts UI', () => {
    const params = coreMock.createAppMountParamters('/fake/base/path');
    const core = coreMock.createStart();

    // Verify some expected DOM element is rendered into the element
    const unmount = renderApp(params, core, {});
    expect(params.element.querySelector('.some-app-class')).not.toBeUndefined();
    // Verify the element is empty after unmounting
    unmount();
    expect(params.element.innerHTML).toEqual('');
  });

  it('unsubscribes from uiSettings', () => {
    const params = coreMock.createAppMountParamters('/fake/base/path');
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
    const params = coreMock.createAppMountParamters('/fake/base/path');
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

### SavedObjects

#### Unit Tests

To unit test code that uses the Saved Objects client mock the client methods
and make assertions against the behaviour you would expect to see.

Since the Saved Objects client makes network requests to an external
Elasticsearch cluster, it's important to include failure scenarios in your
test cases.

When writing a view with which a user might interact, it's important to ensure
your code can recover from exceptions and provide a way for the user to
proceed. This behaviour should be tested as well.

Below is an example of a Jest Unit test suite that mocks the server-side Saved
Objects client:

```typescript
// src/plugins/myplugin/server/lib/short_url_lookup.ts
import crypto from 'crypto';
import { SavedObjectsClientContract } from 'kibana/server';

export const shortUrlLookup = {
  generateUrlId(url: string, savedObjectsClient: SavedObjectsClientContract) {
    const id = crypto
      .createHash('md5')
      .update(url)
      .digest('hex');

    return savedObjectsClient
      .create(
        'url',
        {
          url,
          accessCount: 0,
          createDate: new Date().valueOf(),
          accessDate: new Date().valueOf(),
        },
        { id }
      )
      .then(doc => doc.id)
      .catch(err => {
        if (savedObjectsClient.errors.isConflictError(err)) {
          return id;
        } else {
          throw err;
        }
      });
  },
};

```

```typescript
// src/plugins/myplugin/server/lib/short_url_lookup.test.ts
import { shortUrlLookup } from './short_url_lookup';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';

describe('shortUrlLookup', () => {
  const ID = 'bf00ad16941fc51420f91a93428b27a0';
  const TYPE = 'url';
  const URL = 'http://elastic.co';

  const mockSavedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('generateUrlId', () => {
    it('provides correct arguments to savedObjectsClient', async () => {
      const ATTRIBUTES = {
        url: URL,
        accessCount: 0,
        createDate: new Date().valueOf(),
        accessDate: new Date().valueOf(),
      };
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: ID,
        type: TYPE,
        references: [],
        attributes: ATTRIBUTES,
      });
      await shortUrlLookup.generateUrlId(URL, mockSavedObjectsClient);

      expect(mockSavedObjectsClient.create).toHaveBeenCalledTimes(1);
      const [type, attributes, options] = mockSavedObjectsClient.create.mock.calls[0];
      expect(type).toBe(TYPE);
      expect(attributes).toStrictEqual(ATTRIBUTES);
      expect(options).toStrictEqual({ id: ID });
    });

    it('ignores version conflict and returns id', async () => {
      mockSavedObjectsClient.create.mockRejectedValueOnce(
        mockSavedObjectsClient.errors.decorateConflictError(new Error())
      );
      const id = await shortUrlLookup.generateUrlId(URL, mockSavedObjectsClient);
      expect(id).toEqual(ID);
    });

    it('rejects with passed through savedObjectsClient errors', () => {
      const error = new Error('oops');
      mockSavedObjectsClient.create.mockRejectedValueOnce(error);
      return expect(shortUrlLookup.generateUrlId(URL, mockSavedObjectsClient)).rejects.toBe(error);
    });
  });
});
```

The following is an example of a public saved object unit test. The biggest
difference with the server-side test is the slightly different Saved Objects
client API which returns `SimpleSavedObject` instances which needs to be
reflected in the mock.

```typescript
// src/plugins/myplugin/public/saved_query_service.ts
import {
  SavedObjectsClientContract,
  SavedObjectAttributes,
  SimpleSavedObject,
} from 'src/core/public';

export type SavedQueryAttributes = SavedObjectAttributes & {
  title: string;
  description: 'bar';
  query: {
    language: 'kuery';
    query: 'response:200';
  };
};

export const createSavedQueryService = (savedObjectsClient: SavedObjectsClientContract) => {
  const saveQuery = async (
    attributes: SavedQueryAttributes
  ): Promise<SimpleSavedObject<SavedQueryAttributes>> => {
    try {
      return await savedObjectsClient.create<SavedQueryAttributes>('query', attributes, {
        id: attributes.title as string,
      });
    } catch (err) {
      throw new Error('Unable to create saved query, please try again.');
    }
  };

  return {
    saveQuery,
  };
};
```

```typescript
// src/plugins/myplugin/public/saved_query_service.test.ts
import { createSavedQueryService, SavedQueryAttributes } from './saved_query_service';
import { savedObjectsServiceMock } from '../../../../../core/public/mocks';
import { SavedObjectsClientContract, SimpleSavedObject } from '../../../../../core/public';

describe('saved query service', () => {
  const savedQueryAttributes: SavedQueryAttributes = {
    title: 'foo',
    description: 'bar',
    query: {
      language: 'kuery',
      query: 'response:200',
    },
  };

  const mockSavedObjectsClient = savedObjectsServiceMock.createStartContract()
    .client as jest.Mocked<SavedObjectsClientContract>;

  const savedQueryService = createSavedQueryService(mockSavedObjectsClient);

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('saveQuery', function() {
    it('should create a saved object for the given attributes', async () => {
      // The public Saved Objects client returns instances of
      // SimpleSavedObject, so we create an instance to return from our mock.
      const mockReturnValue = new SimpleSavedObject(mockSavedObjectsClient, {
        type: 'query',
        id: 'foo',
        attributes: savedQueryAttributes,
        references: [],
      });
      mockSavedObjectsClient.create.mockResolvedValue(mockReturnValue);

      const response = await savedQueryService.saveQuery(savedQueryAttributes);
      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith('query', savedQueryAttributes, {
        id: 'foo',
      });
      expect(response).toBe(mockReturnValue);
    });

    it('should reject with an error when saved objects client errors', async done => {
      mockSavedObjectsClient.create.mockRejectedValue(new Error('timeout'));

      try {
        await savedQueryService.saveQuery(savedQueryAttributes);
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[Error: Unable to create saved query, please try again.]`
        );
        done();
      }
    });
  });
});
```

#### Integration Tests
To get the highest confidence in how your code behaves when using the Saved
Objects client, you should write at least a few integration tests which loads
data into and queries a real Elasticsearch database.

To do that we'll write a Jest integration test using `TestUtils` to start
Kibana and esArchiver to load fixture data into Elasticsearch.

1. Create the fixtures data you need in Elasticsearch
2. Create a fixtures archive with `node scripts/es_archiver save <name> [index patterns...]`
3. Load the fixtures in your test using esArchiver `esArchiver.load('name')`;

_todo: fully worked out example_

### Elasticsearch

_How to test ES clients_

## Plugin integrations

In the new platform, all plugin's dependencies to other plugins are explicitly declared in their `kibana.json`
manifest. As for `core`, the dependencies `setup` and `start` contracts are injected in your plugin's respective 
`setup` and `start` phases. One of the upsides with testing is that every usage of the dependencies is explicit,
and that the plugin's contracts must be propagated to the parts of the code using them, meaning that isolating a 
specific logical component for unit testing is way easier than in legacy.

The approach to test parts of a plugin's code that is relying on other plugins is quite similar to testing
code using `core` APIs: it's expected to mock the dependency, and make it return the value the test is expecting.

Most plugins are defining mocks for their contracts. The convention is to expose them in a `mocks` file  in 
`my_plugin/server` and/or `my_plugin/public`. For example for the `data` plugin, the client-side mocks are located in 
`src/plugins/data/public/mocks.ts`. When such mocks are present, it's strongly recommended to use them
when testing against dependencies. Otherwise, one should create it's own mocked implementation of the dependency's
contract (and should probably ping the plugin's owner to ask them to add proper contract mocks).

### Preconditions

For these examples, we are going to see how we should test the `myPlugin` plugin.
 
This plugin declares the `data` plugin as  a `required` dependency and the `usageCollection` plugin as an `optional` 
one. It also exposes a `getSpecialSuggestions` API in it's start contract, which relies on the `data` plugin to retrieve
data.

`MyPlugin` plugin definition:

```typescript
// src/plugins/myplugin/public/plugin.ts
import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../data/public';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { SuggestionsService } from './suggestions';

interface MyPluginSetupDeps {
  data: DataPublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

interface MyPluginStartDeps {
  data: DataPublicPluginStart;
}

export class MyPlugin implements Plugin<MyPluginSetup, MyPluginStart, MyPluginSetupDeps, MyPluginStartDeps> {
  private suggestionsService = new SuggestionsService();

  public setup(core: CoreSetup, { data, usageCollection }: MyPluginSetupDeps) {
    // setup our internal service
    this.suggestionsService.setup(data);

    // an example on using an optional dependency that will be tested
    if (usageCollection) {
      usageCollection.allowTrackUserAgent(true);
    }

    return {};
  }

  public start(core: CoreStart, { data }: MyPluginStartDeps) {
    const suggestions = this.suggestionsService.start(data);
    return {
      getSpecialSuggestions: (query: string) => suggestions.getSuggestions(query),
    };
  }

  public stop() {}
}

export type MyPluginSetup = ReturnType<MyPlugin['setup']>;
export type MyPluginStart = ReturnType<MyPlugin['start']>;
```

The underlying `SuggestionsService` implementation:

```typescript
// src/plugins/myplugin/public/suggestions/suggestion_service.ts
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../data/public';

// stubs for testing purposes
const suggestDependingOn = (...args: any[]) => [];
const baseOptions = {} as any;
export const defaultSuggestions = [
  {
    text: 'a default suggestion',
  },
] as any[];

export class SuggestionsService {
  public setup(data: DataPublicPluginSetup) {
    // register a suggestion provider to the `data` dependency plugin
    data.autocomplete.addQuerySuggestionProvider('fr', async args => {
      return suggestDependingOn(args);
    });
  }

  public start(data: DataPublicPluginStart) {
    return {
      getSuggestions: async (query: string) => {
        // use the `data` plugin contract to retrieve arbitrary data
        // note: this logic does not really make any sense and is only here to introduce a behavior to test
        const baseSuggestions = await data.autocomplete.getQuerySuggestions({
          ...baseOptions,
          query,
        });
        if (!baseSuggestions || baseSuggestions.length === 0) {
          return defaultSuggestions;
        }
        return baseSuggestions.filter(suggestion => suggestion.type !== 'conjunction');
      },
    };
  }
}
```

### Testing dependencies usages

A plugin should test expected usage and calls on it's dependency plugins' API.

Some calls, such as 'registration' APIs exposed from dependency plugins, should be checked,
to ensure both that they are actually executed, and performed with the correct parameters.

For our example plugin's `SuggestionsService`, we should assert that the suggestion provider is correctly 
registered to the `data` plugin during the `setup` phase, and that `getSuggestions` calls 
`autocomplete.getQuerySuggestions` with the correct parameters.

```typescript
// src/plugins/myplugin/public/suggestions/suggestion_service.test.ts
import {
  dataPluginMock,
  Setup as DataPluginSetupMock,
  Start as DataPluginStartMock,
} from '../../../data/public/mocks';
import { SuggestionsService } from './suggestion_service';

describe('SuggestionsService', () => {
  let service: SuggestionsService;
  let dataSetup: DataPluginSetupMock;
  let dataStart: DataPluginStartMock;

  beforeEach(() => {
    service = new SuggestionsService();
    dataSetup = dataPluginMock.createSetupContract();
    dataStart = dataPluginMock.createStartContract();
  });

  describe('#setup', () => {
    it('registers the query suggestion provider to the data plugin', () => {
      service.setup(dataSetup);

      expect(dataSetup.autocomplete.addQuerySuggestionProvider).toHaveBeenCalledTimes(1);
      expect(dataSetup.autocomplete.addQuerySuggestionProvider).toHaveBeenCalledWith(
        'fr',
        expect.any(Function)
      );
    });
  });

  describe('#start', () => {
    describe('#getSuggestions', () => {
      it('calls getQuerySuggestions with the correct query', async () => {
        service.setup(dataSetup);
        const serviceStart = service.start(dataStart);

        await serviceStart.getSuggestions('some query');

        expect(dataStart.autocomplete.getQuerySuggestions).toHaveBeenCalledTimes(1);
        expect(dataStart.autocomplete.getQuerySuggestions).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'some query',
          })
        );
      });
    });
  });
});
```

### Testing components consuming the dependencies

When testing parts of your plugin code that depends on the dependency plugin's data, the best approach
is to mock the dependency to be able to get the behavior expected for the test.

In this example, we are going to mock the results of `autocomplete.getQuerySuggestions` to be able to test 
the service's `getSuggestions` method.

```typescript
// src/plugins/myplugin/public/suggestions/suggestion_service.ts

describe('#start', () => {
  describe('#getSuggestions', () => {
    it('returns the default suggestions when autocomplete returns no results', async () => {
      dataStart.autocomplete.getQuerySuggestions.mockResolvedValue([]);

      service.setup(dataSetup);
      const serviceStart = service.start(dataStart);

      const results = await serviceStart.getSuggestions('some query');
      expect(results).toEqual(defaultSuggestions);
    });

    it('excludes conjunctions from the autocomplete results', async () => {
      dataStart.autocomplete.getQuerySuggestions.mockResolvedValue([
        {
          type: 'field',
          text: 'field suggestion',
        },
        {
          type: 'conjunction',
          text: 'conjunction suggestion',
        },
      ]);

      service.setup(dataSetup);
      const serviceStart = service.start(dataStart);

      const results = await serviceStart.getSuggestions('some query');

      expect(results).toEqual([
        {
          type: 'field',
          text: 'field suggestion',
        },
      ]);
    });
  });
});
```

### Testing optional plugin dependencies

Plugins should test that their behavior remains correct when their optional dependencies are either available or not.

A basic test would be to ensure that the plugin properly initialize without error when the optional
dependency is missing:

```typescript
// src/plugins/myplugin/public/plugin.test.ts
import { coreMock } from '../../../core/public/mocks';
import { dataPluginMock } from '../../data/public/mocks';
import { MyPlugin } from './plugin';

describe('Plugin', () => {
  it('initializes correctly if usageCollection is disabled', () => {
    const plugin = new MyPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const setupDeps = {
      data: dataPluginMock.createSetupContract(),
      // optional usageCollector dependency is not available
    };
  
    const coreStart = coreMock.createStart();
    const startDeps = {
      data: dataPluginMock.createStartContract(),
    };
  
    expect(() => {
      plugin.setup(coreSetup, setupDeps);
    }).not.toThrow();
    expect(() => {
      plugin.start(coreStart, startDeps);
    }).not.toThrow();
  });
});
```

Then we should test that when optional dependency is properly used when present:

```typescript
// src/plugins/myplugin/public/plugin.test.ts
import { coreMock } from '../../../core/public/mocks';
import { dataPluginMock } from '../../data/public/mocks';
import { usageCollectionPluginMock } from '../../usage_collection/public/mocks';

import { MyPlugin } from './plugin';

describe('Plugin', () => {
  // [...]

  it('enables trackUserAgent when usageCollection is available', async () => {
    const plugin = new MyPlugin(coreMock.createPluginInitializerContext());
    const coreSetup = coreMock.createSetup();
    const usageCollectionSetup = usageCollectionPluginMock.createSetupContract();
    const setupDeps = {
      data: dataPluginMock.createSetupContract(),
      usageCollection: usageCollectionSetup,
    };

    plugin.setup(coreSetup, setupDeps);

    expect(usageCollectionSetup.allowTrackUserAgent).toHaveBeenCalledTimes(1);
    expect(usageCollectionSetup.allowTrackUserAgent).toHaveBeenCalledWith(true);
  });
});
```
