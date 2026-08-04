# deepagent Knowledge Base: Dependency Injection

## Overview

Dependency injection patterns account for approximately 3% of deepagent's feedback (~15+ items across ~400 PRs). Despite the relatively low volume, DI violations (particularly module-level singletons) are among the most likely to be flagged as blockers. deepagent enforces a specific DI pattern: factory function closures.

---

## Core Principle: No Module-Level Singletons

### The Rule (BLOCKER)

**PR #244957 - No module-level singletons (BLOCKER)**

Module-level variables that hold service references or mutable state are a blocker. This is the most consistently enforced DI rule.

```typescript
// BLOCKER - module-level singleton
let esClient: ElasticsearchClient;
let logger: Logger;

export function setup(client: ElasticsearchClient, log: Logger) {
  esClient = client;
  logger = log;
}

export async function searchDocuments(query: string) {
  logger.info(`Searching for: ${query}`);
  return esClient.search({ body: { query: { match: { content: query } } } });
}
```

### Why It's a Blocker

1. **Hidden global state**: The dependency is not visible in the function signature. Reading `searchDocuments` doesn't reveal that it depends on `esClient` and `logger`.

2. **Testing difficulty**: To test `searchDocuments`, you must call `setup()` first with mocks. This creates implicit ordering requirements in tests.

3. **Multi-instance problems**: In environments where multiple instances are needed (e.g., different spaces, different security contexts), a singleton forces all callers to share the same instance.

4. **Initialization ordering**: If `searchDocuments` is called before `setup()`, it fails with a cryptic error about `esClient` being undefined.

5. **Memory leaks**: Module-level references prevent garbage collection even when the service is no longer needed.

---

## The Pattern: Factory Function Closures

### Basic Pattern

**PR #242598 - Factory function closures (WARNING)**
**PR #244957 - No module-level singletons (BLOCKER)**

The standard DI pattern in Agent Builder and Kibana platform code is the factory function closure:

```typescript
// CORRECT - factory function closure
export function createDocumentSearcher(
  esClient: ElasticsearchClient,
  logger: Logger
) {
  return {
    search: async (query: string) => {
      logger.info(`Searching for: ${query}`);
      return esClient.search({
        body: { query: { match: { content: query } } },
      });
    },
  };
}

// Usage in plugin setup
class MyPlugin {
  setup(core: CoreSetup) {
    const searcher = createDocumentSearcher(
      core.elasticsearch.client,
      core.logger.get('searcher')
    );
    // searcher.search() is now a self-contained function
  }
}
```

### Why This Pattern Works

1. **Explicit dependencies**: The factory function signature declares exactly what is needed.
2. **Testable**: Pass mocks directly to the factory in tests.
3. **Multi-instance**: Create multiple instances with different dependencies.
4. **No initialization ordering**: The factory returns a ready-to-use object.
5. **Garbage collection**: When the returned object is no longer referenced, all closed-over dependencies can be collected.

### Returning Functions vs Objects

For simple cases (single function), return the function directly:

```typescript
// Single function - return it directly
export function createSearcher(esClient: ElasticsearchClient) {
  return async (query: string) => {
    return esClient.search({ body: { query: { match: { content: query } } } });
  };
}

const search = createSearcher(esClient);
await search('my query');
```

For complex cases (multiple related functions), return an object:

```typescript
// Multiple functions - return an object
export function createToolManager(
  esClient: ElasticsearchClient,
  savedObjects: SavedObjectsClient,
  logger: Logger
) {
  return {
    register: async (tool: Tool) => { ... },
    unregister: async (toolId: string) => { ... },
    get: async (toolId: string) => { ... },
    list: async () => { ... },
  };
}

const toolManager = createToolManager(esClient, savedObjects, logger);
await toolManager.register(myTool);
```

---

## Pass Services, Not Results

### The Rule (WARNING)

**PR #237009 - Pass services not results (WARNING)**

When a function needs access to external data, pass the service that provides the data, not the pre-fetched result.

```typescript
// BAD - passes pre-fetched result
async function processRequest(
  request: Request,
  license: License,        // Pre-fetched, might be stale
  currentUser: User        // Pre-fetched, might not have all needed info
) {
  if (license.isActive) { ... }
}

// GOOD - passes services
async function processRequest(
  request: Request,
  licensing: LicensingService,
  security: SecurityService
) {
  const license = await licensing.getLicense();
  if (license.isActive) { ... }
  const user = await security.getCurrentUser(request);
  // Function fetches exactly what it needs
}
```

### Why Pass Services

1. **Freshness**: The function gets current data, not potentially stale pre-fetched data
2. **Precision**: The function fetches exactly what it needs, no more
3. **Security context**: Services may enforce per-request security boundaries
4. **Testability**: Mock the service to control what data is returned in tests
5. **Lazy evaluation**: Data is only fetched if actually needed

---

## DI in Agent Builder Specifically

### Tool Handler DI

Tool handlers in the Agent Builder receive their dependencies through the handler context:

```typescript
// Tool definition with DI via context
const myTool = {
  name: 'search_documents',
  description: 'Search for documents',
  schema: { ... },
  handler: async (input: ToolInput, context: ToolHandlerContext) => {
    // Dependencies come through context, not module-level variables
    const { esClient, savedObjects, logger } = context;
    return esClient.search({ ... });
  },
};
```

### Plugin Setup DI

Plugins receive dependencies through the setup and start lifecycle methods:

```typescript
class AgentBuilderPlugin {
  setup(core: CoreSetup, plugins: PluginSetupDeps) {
    // All dependencies provided through lifecycle parameters
    const toolManager = createToolManager(
      core.elasticsearch.client,
      core.savedObjects.client,
      core.logger.get('tool-manager')
    );

    // Register routes with dependency injection
    registerRoutes(core.http, toolManager, plugins.licensing);
  }
}
```

### Route Handler DI

Route handlers receive scoped clients through the request context:

```typescript
function registerRoutes(
  http: HttpServiceSetup,
  toolManager: ToolManager,
  licensing: LicensingPluginSetup
) {
  const router = http.createRouter();

  router.get(
    { path: '/api/agent_builder/tools', validate: {} },
    async (context, request, response) => {
      // Scoped clients from request context
      const esClient = (await context.core).elasticsearch.client;
      const savedObjects = (await context.core).savedObjects.client;

      // toolManager was injected at setup time
      const tools = await toolManager.list(savedObjects);
      return response.ok({ body: { tools } });
    }
  );
}
```

---

## Testing with Factory Functions

### Simple Unit Test

```typescript
describe('createDocumentSearcher', () => {
  it('should search with the provided query', async () => {
    // Arrange - create mock dependencies
    const mockEsClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    } as unknown as ElasticsearchClient;
    const mockLogger = { info: jest.fn() } as unknown as Logger;

    // Create instance with mocks
    const searcher = createDocumentSearcher(mockEsClient, mockLogger);

    // Act
    await searcher.search('test query');

    // Assert
    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { query: { match: { content: 'test query' } } },
      })
    );
    expect(mockLogger.info).toHaveBeenCalledWith('Searching for: test query');
  });
});
```

### Multiple Instances in Tests

```typescript
it('should support different configurations', async () => {
  const prodSearcher = createDocumentSearcher(prodEsClient, prodLogger);
  const testSearcher = createDocumentSearcher(testEsClient, testLogger);

  // Each instance uses its own dependencies
  await prodSearcher.search('prod query');
  await testSearcher.search('test query');

  expect(prodEsClient.search).toHaveBeenCalledTimes(1);
  expect(testEsClient.search).toHaveBeenCalledTimes(1);
});
```

---

## Common Anti-patterns

### 1. Module-Level Singletons
Already covered. The primary blocker.

### 2. Initialize-Then-Use Pattern

```typescript
// BAD - two-step initialization
class ToolService {
  private esClient!: ElasticsearchClient;

  initialize(esClient: ElasticsearchClient) {
    this.esClient = esClient;
  }

  async search(query: string) {
    return this.esClient.search({ ... }); // Crashes if initialize wasn't called
  }
}

// GOOD - constructor injection or factory
class ToolService {
  constructor(private readonly esClient: ElasticsearchClient) {}

  async search(query: string) {
    return this.esClient.search({ ... }); // Always ready
  }
}
```

### 3. Service Locator Pattern

```typescript
// BAD - service locator
import { getService } from './service_registry';

function searchDocuments(query: string) {
  const esClient = getService('elasticsearch');
  return esClient.search({ ... });
}

// GOOD - explicit injection
function createSearcher(esClient: ElasticsearchClient) {
  return (query: string) => esClient.search({ ... });
}
```

### 4. Passing Pre-Fetched Results
Already covered. Pass services, not results.

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| Module-level singleton | BLOCKER |
| Initialize-then-use pattern | WARNING |
| Service locator pattern | WARNING |
| Passing pre-fetched results instead of services | WARNING |
| Missing factory function for service-dependent code | WARNING |
