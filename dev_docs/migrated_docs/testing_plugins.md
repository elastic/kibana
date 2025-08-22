# Testing Kibana Plugins

A comprehensive guide to testing different aspects of Kibana plugins using unit tests, integration tests, and end-to-end testing strategies.

## Testing Strategy

Follow the testing pyramid approach with three tiers:

1. **Unit tests** - Fast, isolated, extensive mocking
2. **Integration tests** - System interaction verification  
3. **End-to-end tests** - Browser-based user flow testing

## Quick Start Examples

### Basic Unit Test

```typescript
// src/plugins/my_plugin/server/formatter.test.ts
import { TextFormatter } from './formatter';
import { sanitizerMock } from './mocks';

describe('TextFormatter', () => {
  it('formats text correctly', async () => {
    const sanitizer = sanitizerMock.createSetup();
    sanitizer.sanitize.mockImplementation((input: string) => `cleaned:${input}`);
    
    const result = await TextFormatter.format('test', sanitizer);
    expect(result).toBe('cleaned:test');
  });
});
```

### HTTP Route Integration Test

```typescript
// integration_tests/routes.test.ts
import * as kbnTestServer from 'src/core/test_helpers/kbn_server';

describe('/api/my-plugin', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;
  
  beforeAll(async () => {
    root = kbnTestServer.createRoot();
    await root.preboot();
    await root.setup();
    await root.start();
  });

  it('validates request body', async () => {
    await kbnTestServer.request
      .post(root, '/api/my-plugin/data')
      .send({ invalid: 'data' })
      .expect(400);
  });
});
```

## Core API Testing

### Mocking Core Services

Use official mocks from `src/core/server/mocks` and `src/core/public/mocks`:

```typescript
import { elasticsearchServiceMock, coreMock } from 'src/core/server/mocks';

test('elasticsearch client integration', async () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  esClient.callAsCurrentUser.mockResolvedValue({ hits: { total: 0 } });
  
  const result = await mySearchFunction(esClient);
  
  expect(esClient.callAsCurrentUser).toHaveBeenCalledWith('search', {
    index: 'my-index',
    body: { query: { match_all: {} } }
  });
});
```

## HTTP Route Testing

### Route Controller Pattern

```typescript
// routes/text_formatter.ts
class TextFormatter {
  static async format(text: string, sanitizer: Deps['sanitizer']) {
    const sanitizedText = await sanitizer.sanitize(text);
    return sanitizedText;
  }
}

router.get({
  path: '/api/formatter',
  validate: {
    query: schema.object({
      text: schema.string({ maxLength: 100 }),
    }),
  },
}, async (context, request, response) => {
  try {
    const result = await TextFormatter.format(request.query.text, deps.sanitizer);
    return response.ok({ body: result });
  } catch (error) {
    if (error instanceof MisformedTextError) {
      return response.badRequest({ body: error.message });
    }
    throw error;
  }
});
```

### Functional Test Runner (FTR)

For full-stack testing with real Elasticsearch:

```typescript
// test/api_integration/apis/my_plugin/formatter.ts
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  
  describe('formatter API', () => {
    it('processes valid text', async () => {
      const response = await supertest
        .get('/api/formatter')
        .query({ text: 'hello world' })
        .expect(200);
        
      expect(response.text).toBe('processed: hello world');
    });
    
    it('rejects oversized input', async () => {
      await supertest
        .get('/api/formatter')
        .query({ text: 'x'.repeat(101) })
        .expect(400);
    });
  });
}
```

### TestUtils Integration

For Kibana-only testing without Elasticsearch:

```typescript
// integration_tests/formatter.test.ts
import * as kbnTestServer from 'src/core/test_helpers/kbn_server';

describe('formatter integration', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;
  
  beforeAll(async () => {
    root = kbnTestServer.createRoot();
    await root.preboot();
    await root.setup();
    await root.start();
  }, 30000);

  afterAll(async () => await root.shutdown());
  
  it('handles malformed input', async () => {
    await kbnTestServer.request
      .get(root, '/api/formatter')
      .query({ text: '<script>alert("xss")</script>' })
      .expect(400, 'Invalid HTML detected');
  });
});
```

## Application Testing

### React Application Mount/Unmount

```typescript
// application.ts
export const renderApp = (
  { element, history }: AppMountParameters,
  core: CoreStart,
  plugins: MyPluginDepsStart
) => {
  // Set application state
  core.chrome.setIsVisible(false);
  
  // Create subscription
  const settings$ = core.uiSettings.get$('theme').subscribe(handleThemeChange);
  
  // Render React app
  ReactDOM.render(<AppRoot history={history} core={core} />, element);
  
  // Return cleanup function
  return () => {
    ReactDOM.unmountComponentAtNode(element);
    settings$.unsubscribe();
    core.chrome.setIsVisible(true);
  };
};
```

### Application Test Suite

```typescript
// application.test.ts
import { coreMock } from 'src/core/public/mocks';
import { renderApp } from './application';

describe('renderApp', () => {
  it('mounts and unmounts correctly', () => {
    const params = coreMock.createAppMountParameters();
    const core = coreMock.createStart();
    
    const unmount = renderApp(params, core, {});
    expect(params.element.querySelector('.app-container')).toBeTruthy();
    
    unmount();
    expect(params.element.innerHTML).toBe('');
  });
  
  it('cleans up subscriptions', () => {
    const params = coreMock.createAppMountParameters();
    const core = coreMock.createStart();
    const settings$ = new Subject();
    core.uiSettings.get$.mockReturnValue(settings$);
    
    const unmount = renderApp(params, core, {});
    expect(settings$.observers.length).toBe(1);
    
    unmount();
    expect(settings$.observers.length).toBe(0);
  });
});
```

## SavedObjects Testing

### Server-Side SavedObjects Client

```typescript
// saved_object_service.test.ts
import { savedObjectsClientMock } from 'src/core/server/mocks';

describe('shortUrlLookup', () => {
  const mockClient = savedObjectsClientMock.create();
  
  beforeEach(() => jest.resetAllMocks());
  
  it('creates saved object with correct attributes', async () => {
    mockClient.create.mockResolvedValue({
      id: 'generated-id',
      type: 'url',
      attributes: { url: 'https://example.com' },
      references: []
    });
    
    const result = await shortUrlLookup.create('https://example.com', mockClient);
    
    expect(mockClient.create).toHaveBeenCalledWith(
      'url',
      { url: 'https://example.com', accessCount: 0 },
      { id: expect.any(String) }
    );
  });
  
  it('handles version conflicts gracefully', async () => {
    mockClient.create.mockRejectedValue(
      mockClient.errors.decorateConflictError(new Error())
    );
    
    const id = await shortUrlLookup.create('https://example.com', mockClient);
    expect(id).toBeDefined(); // Should return generated ID even on conflict
  });
});
```

### Client-Side SavedObjects

```typescript
// public/saved_query_service.test.ts
import { savedObjectsServiceMock } from 'src/core/public/mocks';
import { SimpleSavedObject } from 'src/core/public';

describe('saved query service', () => {
  const mockClient = savedObjectsServiceMock.createStartContract().client;
  
  it('creates saved query', async () => {
    const mockSavedObject = new SimpleSavedObject(mockClient, {
      type: 'query',
      id: 'query-1',
      attributes: { title: 'My Query', query: { match_all: {} } },
      references: []
    });
    
    mockClient.create.mockResolvedValue(mockSavedObject);
    
    const result = await saveQuery({ title: 'My Query', query: { match_all: {} } });
    expect(result.id).toBe('query-1');
  });
});
```

## Plugin Dependencies Testing

### Required Dependencies

```typescript
// plugin.test.ts
import { dataPluginMock } from '../../data/public/mocks';
import { MyPlugin } from './plugin';

describe('MyPlugin', () => {
  it('registers suggestion provider', () => {
    const plugin = new MyPlugin();
    const dataSetup = dataPluginMock.createSetupContract();
    
    plugin.setup(coreMock.createSetup(), { data: dataSetup });
    
    expect(dataSetup.autocomplete.addQuerySuggestionProvider)
      .toHaveBeenCalledWith('myLanguage', expect.any(Function));
  });
});
```

### Optional Dependencies

```typescript
it('works without optional dependency', () => {
  const plugin = new MyPlugin();
  
  expect(() => {
    plugin.setup(coreMock.createSetup(), {
      data: dataPluginMock.createSetupContract()
      // usageCollection not provided
    });
  }).not.toThrow();
});

it('uses optional dependency when available', () => {
  const usageCollection = usageCollectionMock.createSetupContract();
  
  plugin.setup(coreMock.createSetup(), {
    data: dataPluginMock.createSetupContract(),
    usageCollection
  });
  
  expect(usageCollection.reportUiCounter).toHaveBeenCalled();
});
```

## RxJS Observable Testing

### Marble Testing Setup

```typescript
import { TestScheduler } from 'rxjs/testing';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
```

### Interval-Based Observable Testing

```typescript
describe('polling service', () => {
  it('emits updates at correct intervals', () => {
    getTestScheduler().run(({ expectObservable }) => {
      const updates$ = interval(100).pipe(
        map(count => `update-${count + 1}`)
      );
      
      expectObservable(updates$, '301ms !').toBe('100ms a 99ms b 99ms c', {
        a: 'update-1',
        b: 'update-2', 
        c: 'update-3'
      });
    });
  });
});
```

### Observable Completion and Error Testing

```typescript
it('completes when abort signal fires', () => {
  getTestScheduler().run(({ expectObservable, hot }) => {
    const abort$ = hot('149ms a', { a: undefined });
    const stream$ = interval(100).pipe(takeUntil(abort$));
    
    expectObservable(stream$).toBe('100ms a 48ms |', { a: 0 });
  });
});

it('handles processing errors', () => {
  getTestScheduler().run(({ expectObservable, hot }) => {
    const data$ = hot('--a--b--(c|)', {
      a: { id: 'valid' },
      b: { id: 'invalid' }, 
      c: { id: 'also-valid' }
    });
    
    expectObservable(processData(data$)).toBe(
      '--a--#',
      { a: { processed: true } },
      new Error('Invalid data')
    );
  });
});
```

## Model Version Testing

### Unit Testing Model Versions

```typescript
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';

describe('SavedObject model versions', () => {
  let migrator: ModelVersionTestMigrator;
  
  beforeEach(() => {
    migrator = createModelVersionTestMigrator({ type: mySavedObjectType });
  });
  
  it('migrates from v1 to v2 correctly', () => {
    const v1Doc = createV1Document();
    
    const migrated = migrator.migrate({
      document: v1Doc,
      fromVersion: 1,
      toVersion: 2
    });
    
    expect(migrated.attributes).toHaveProperty('newField');
    expect(migrated.attributes.newField).toBe('defaultValue');
  });
});
```

### Integration Testing Model Versions

```typescript
import { createModelVersionTestBed } from '@kbn/core-test-helpers-model-versions';

describe('model version cohabitation', () => {
  const testbed = createModelVersionTestBed();
  let testkit: ModelVersionTestKit;
  
  beforeAll(async () => await testbed.startES());
  afterAll(async () => await testbed.stopES());
  
  beforeEach(async () => {
    testkit = await testbed.prepareTestKit({
      savedObjectDefinitions: [{
        definition: mySavedObjectType,
        modelVersionBefore: 1,
        modelVersionAfter: 2
      }]
    });
  });
  
  it('handles version cohabitation', async () => {
    const v1Repository = testkit.repositoryBefore;
    const v2Repository = testkit.repositoryAfter;
    
    // Create with v1
    await v1Repository.create('my-type', { oldField: 'value' }, { id: 'test' });
    
    // Read with v2 (should be migrated)
    const v2Doc = await v2Repository.get('my-type', 'test');
    expect(v2Doc.attributes).toHaveProperty('newField');
  });
});
```

## Best Practices

### Test Organization

```typescript
describe('MyFeature', () => {
  describe('when user is authenticated', () => {
    beforeEach(() => setupAuthenticatedUser());
    
    it('allows access to protected resources', () => {
      // test implementation
    });
  });
  
  describe('when user is not authenticated', () => {
    it('redirects to login', () => {
      // test implementation  
    });
  });
});
```

### Mock Management

```typescript
// Use consistent mock patterns
const mockDependency = dependencyMock.createContract();

beforeEach(() => {
  jest.resetAllMocks();
  mockDependency.someMethod.mockResolvedValue(defaultResponse);
});
```

### Error Scenarios

Always test error conditions:

```typescript
it('handles network failures gracefully', async () => {
  mockHttpClient.get.mockRejectedValue(new Error('Network error'));
  
  const result = await fetchData();
  expect(result).toEqual({ error: 'Failed to fetch data' });
});
```

## Key Testing Guidelines

1. **Test behavior, not implementation** - Focus on observable outcomes
2. **Use appropriate test types** - Unit for logic, integration for interactions, e2e for workflows  
3. **Mock external dependencies** - Keep tests fast and reliable
4. **Test error conditions** - Network failures, validation errors, edge cases
5. **Clean up resources** - Unsubscribe observables, reset mocks, clear timers
6. **Use official mocks** - Leverage Core and plugin mocks when available

This testing approach ensures reliable, maintainable Kibana plugins with comprehensive coverage across all architectural layers.