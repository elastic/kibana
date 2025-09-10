## Functional Test Runner (FTR) - Comprehensive Guide

FTR tests are critical for Kibana QA and come in two main flavors: `api_integration` and `ui` tests. They require building plugins, starting servers, and running specific configurations.
FTR uses a configuration hierarchy where base configs provide shared settings and runnable configs extend them for specific test suites. Do not modify or run base configs directly; instead, create new runnable configs as needed.

**CRITICAL TESTING RULE:** NEVER remove code or tests to make tests pass. Only refactor them or replace them with completely new tests to maintain code coverage. Deleted tests represent lost validation of critical functionality.

### FTR Architecture
```
Build Kibana Plugins → Start Test Server → Run Test Config → Execute Tests
```

### Core FTR Commands
```bash
# Main FTR commands
yarn test:ftr                    # Start servers and run tests (recommended)
yarn test:ftr:runner             # Direct test runner
yarn test:ftr:server             # Only start FTR servers for Elasticsearch and Kibana

# Run specific config (example with actual runnable config)
yarn test:ftr --config x-pack/solutions/observability/plugins/synthetics/e2e/config.ts

# Run specific test file
yarn test:ftr --config path/to/config.ts --grep "test name"
```

### FTR Test Types

FTR tests come in two main flavors, each with hierarchical configuration:

**API Integration Tests:**
- Test REST API endpoints without browser interaction

**UI Functional Tests:**
- Test user interface interactions with browser automation

### Writing FTR Tests

**1. Test Configuration Structure:**
```typescript
// config.ts example
import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('../config.base.ts'));
  
  return {
    ...baseConfig.getAll(),
    testFiles: [require.resolve('./my_test_suite')],
    kbnTestServer: {
      ...baseConfig.get('kbnTestServer'),
      serverArgs: [
        ...baseConfig.get('kbnTestServer.serverArgs'),
        '--custom.setting=value',
      ],
    },
  };
}
```

**2. Test Implementation:**
```typescript
// test.ts example
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('My Feature', () => {
    it('should work correctly', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await testSubjects.click('myButton');
      // assertions...
    });
  });
}
```

### FTR Development Workflow

**1. Build and Start:**
**Critical Build Step:** FTR tests require building Kibana plugins first
```bash
# Build Option A: Build all platform plugins (required for FTR tests)
node scripts/build_kibana_platform_plugins

# Build Option B: Build specific plugins by name, including any dependencies (faster for targeted testing)
node scripts/build_kibana_platform_plugins --focus securitySolution

# Start Option A: Start server and run tests separately
yarn test:ftr:server --config path/to/config.ts
yarn test:ftr:runner --config path/to/config.ts

# Start Option B: Run server and runner together
yarn test:ftr --config path/to/config.ts
```

**2. Debug FTR Tests:**
```bash
# Run with debug output
yarn test:ftr --config path/to/config.ts --debug

# Run specific test pattern
yarn test:ftr --config path/to/config.ts --grep "my test pattern"

# Keep browser open for debugging
yarn test:ftr --config path/to/config.ts --debug --bail
```

### Common FTR Issues
- **Bootstrap Required:** Always run `yarn kbn bootstrap` before FTR tests
- **Server Conflicts:** Ensure no other Kibana instances running on 5601
- **ES Dependencies:** Some tests require specific Elasticsearch setup
- **Config Inheritance:** Verify config extends correct base configuration

## Jest Tests

Jest tests in Kibana come in two distinct flavors: **unit tests** and **integration tests**. Each serves different purposes and follows specific patterns for configuration, organization, and implementation.

### Unit Tests

Unit tests are fast, isolated tests that verify individual functions, classes, or components. They extensively use mocks for external dependencies and focus on testing business logic in isolation.

#### Configuration and Setup

**Jest Configuration:**
- **Preset:** `@kbn/test` (main Jest preset for unit tests)
- **Test Environment:** `jest-environment-jsdom` (for browser-like testing)
- **Test Pattern:** `**/*.test.{js,mjs,ts,tsx}` (excludes `integration_tests/` directories)
- **Setup Files:** Includes polyfills, EUI mocks, React Testing Library, and i18n mocks

**Example jest.config.js:**
```js
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: ['<rootDir>/src/plugins/my_plugin'],
  setupFilesAfterEnv: ['<rootDir>/src/plugins/my_plugin/setup_tests.ts'], // optional
};
```

#### File Organization and Patterns

**File Placement:**
- Co-locate test files with source code: `src/my_component.test.ts`
- Use descriptive test file names: `*.test.ts`, `*.test.tsx`
- Group related tests in `describe` blocks by component/function

**Common Test Structure:**
```typescript
import { myFunction } from './my_function';
import { dependencyMock } from './dependency.mock';

describe('myFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected result when given valid input', () => {
    // Arrange
    const input = 'test input';
    dependencyMock.someMethod.mockReturnValue('mocked response');

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected result');
    expect(dependencyMock.someMethod).toHaveBeenCalledWith(input);
  });
});
```

#### Mocking Strategies

**Core Service Mocks:**
- Use provided mocks from `@kbn/core/public/mocks` and `@kbn/core/server/mocks`
- Mock plugin contracts and external dependencies
- Leverage `jest.doMock()` for module-level mocking

**Example Mocking Patterns:**
```typescript
// Mock external modules
jest.mock('@kbn/some-package', () => ({
  someFunction: jest.fn(),
}));

// Mock with jest.doMock for TypeScript inference
jest.doMock('./services', () => ({
  MyService: jest.fn(() => mockServiceInstance),
}));

// Use Kibana core mocks
import { coreMock } from '@kbn/core/public/mocks';
const mockCoreSetup = coreMock.createSetup();
```

**Mock and Test Data Organization:**
- Use `__mocks__/` directories for Jest automatic mocks and reusable mock implementations
- Use `__fixtures__/` directories for test data, sample responses, and mock objects
- Keep these directories close to the code they support for easy discovery

#### React Component Testing

**TestBed Pattern for Complex Components:**
```typescript
import { registerTestBed } from '@kbn/test-jest-helpers';
import { MyComponent } from './my_component';

describe('MyComponent', () => {
  const setup = registerTestBed(MyComponent, {
    memoryRouter: { wrapComponent: false },
  });

  it('should render correctly', async () => {
    const testBed = setup();
    const { component, find, exists } = testBed;

    expect(exists('myTestSubject')).toBe(true);
    expect(find('myButton').text()).toBe('Click me');
  });
});
```

**Simple Component Testing:**
```typescript
import { render, screen } from '@testing-library/react';
import { MySimpleComponent } from './my_simple_component';

describe('MySimpleComponent', () => {
  it('displays the correct text', () => {
    render(<MySimpleComponent message="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

#### Best Practices for Unit Tests

- **Fast Execution:** Mock all external dependencies (HTTP calls, file system, etc.)
- **Isolated Testing:** Each test should be independent and not rely on others
- **Comprehensive Coverage:** Test edge cases, error conditions, and happy paths
- **Clear Naming:** Use descriptive test names that explain the expected behavior
- **AAA Pattern:** Structure tests with clear Arrange, Act, Assert sections

### Integration Tests

Integration tests verify interactions between components, services, or systems. They test against more realistic scenarios with actual dependencies when needed.

#### Configuration and Setup

**Jest Configuration Options:**
- **Preset:** `@kbn/test/jest_integration` (browser environment) or `@kbn/test/jest_integration_node` (Node.js environment)
- **Test Pattern:** `**/integration_tests/**/*.test.{js,mjs,ts,tsx}`
- **Longer Timeouts:** 10-minute default timeout for integration tests

**Example Integration Test Config:**
```js
module.exports = {
  preset: '@kbn/test/jest_integration_node',
  rootDir: '../../../..',
  roots: ['<rootDir>/src/plugins/my_plugin/server/integration_tests'],
  testMatch: ['**/*.test.{js,mjs,ts,tsx}'],
};
```

#### HTTP API Integration Testing

**Using TestUtils for Kibana Server Testing:**
```typescript
import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('My Plugin API Integration', () => {
  let root: ReturnType<typeof createRoot>;

  beforeAll(async () => {
    root = createRoot();
    await root.preboot();
    await root.setup();
    await root.start();
  }, 30000);

  afterAll(async () => await root.shutdown());

  it('should validate request parameters', async () => {
    const response = await request
      .post(root, '/api/my_plugin/endpoint')
      .send({ invalidData: true })
      .expect(400);

    expect(response.body.message).toContain('validation error');
  });

  it('should process valid requests correctly', async () => {
    const response = await request
      .post(root, '/api/my_plugin/endpoint')
      .send({ validData: 'test' })
      .expect(200);

    expect(response.body).toHaveProperty('result');
  });
});
```

#### Plugin Integration Testing

**Testing Plugin Lifecycle and Dependencies:**
```typescript
import { coreMock } from '@kbn/core/server/mocks';
import { MyPlugin } from '../plugin';

describe('MyPlugin Integration', () => {
  let plugin: MyPlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    plugin = new MyPlugin(coreMock.createPluginInitializerContext());
    coreSetup = coreMock.createSetup();
  });

  it('should register routes during setup', async () => {
    const { http } = coreSetup;
    await plugin.setup(coreSetup, {});

    expect(http.createRouter).toHaveBeenCalled();
  });

  it('should integrate with dependent plugins', async () => {
    const mockDependentPlugin = { someMethod: jest.fn() };
    await plugin.setup(coreSetup, { dependentPlugin: mockDependentPlugin });

    expect(mockDependentPlugin.someMethod).toHaveBeenCalledWith(
      expect.any(Object)
    );
  });
});
```

#### Advanced Integration Testing

**Testing with Real Elasticsearch (when needed):**
```typescript
// This pattern is for tests that truly need Elasticsearch integration
import { Client } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

describe('ES Integration', () => {
  // Use real ES client when testing actual ES interactions
  let esClient: Client;
  
  beforeAll(() => {
    // Only when absolutely necessary - most tests should use mocks
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });
});
```

#### Best Practices for Integration Tests

- **Real Dependencies:** Use actual services and dependencies where testing integration is critical
- **Selective Mocking:** Mock only external services that are not part of the integration being tested
- **Data Setup/Teardown:** Properly clean up test data and state between tests
- **Realistic Scenarios:** Test real user workflows and cross-plugin interactions
- **Performance Awareness:** Integration tests are slower; focus on critical integration points
- **Error Handling:** Test error propagation and recovery across system boundaries

#### When to Use Each Type

**Use Unit Tests for:**
- Business logic validation
- Component behavior in isolation
- Edge cases and error conditions
- Fast feedback during development
- High code coverage goals

**Use Integration Tests for:**
- API endpoint validation
- Plugin lifecycle testing
- Cross-service communication
- Database interactions (when necessary)
- Complex user workflows that span multiple components
