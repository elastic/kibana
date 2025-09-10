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
