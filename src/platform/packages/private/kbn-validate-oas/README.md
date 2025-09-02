# @kbn/validate-oas

Enhanced OpenAPI Specification (OAS) validation package for Kibana with support for incremental validation, multiple output formats, and git integration.

<!-- TODO: update README to include minimal nescessary documentation from the docs folder -->

## CLI Usage (Original)

```bash
node ./scripts/validate_oas_docs.js --help
```

## Enhanced Validation API

```typescript
import { runEnhancedValidation } from '@kbn/validate-oas';

const result = await runEnhancedValidation({
  file: { only: 'serverless' },
  output: { format: 'cli' }
});
```

## Features

### 🔧 **Classes**

- **FileSelector**: Handles file selection and path filtering
- **OutputFormatter**: Supports CLI, JSON, and GitHub comment output formats
- **GitDiffAnalyzer**: Provides incremental validation based on git changes
- **runEnhancedValidation()**: Main enhanced validation function

### 🎯 **Capabilities**

- ✅ **Multiple Output Formats**: CLI (original), JSON, GitHub comment markdown
- ✅ **Incremental Validation**: Only validate changed OAS files based on git diff
- ✅ **Path Filtering**: Focus validation on specific API endpoints
- ✅ **Git Integration**: Smart detection of OAS-related changes
- ✅ **Backward Compatibility**: Original CLI functionality preserved
- ✅ **CI/CD Ready**: Designed for GitHub Actions and Buildkite integration

### 📊 **Output Formats**

#### CLI Format (Default)
Matches the original validation output:
```
info About to validate spec at /path/to/kibana.serverless.yaml
   │ warn /path/to/kibana.serverless.yaml is NOT valid
   │ warn Found the following issues
   │
   │      /paths/~1api~1fleet~1agent_policies/get/responses/200
   │      must have required property 'description'
   │ ...
```

#### JSON Format
Structured data for programmatic use:
```json
{
  "summary": {
    "totalFiles": 1,
    "validFiles": 0,
    "invalidFiles": 1,
    "totalErrors": 25
  },
  "results": [...]
}
```

#### GitHub Comment Format
Formatted for PR comments:
```markdown
## ❌ OpenAPI Specification Validation Issues Found

Found 25 validation error(s) across 1 file(s).

### ☁️ serverless variant
**File:** `kibana.serverless.yaml`
**Errors:** 25
...
```

## Running Tests

### Unit Tests

Run unit tests for the package:

```bash
# From the Kibana root directory
yarn test:jest --config src/platform/packages/private/kbn-validate-oas/jest.config.js
```

### Integration Tests

Run integration tests:

```bash
# From the Kibana root directory
yarn test:jest_integration --config src/platform/packages/private/kbn-validate-oas/jest.integration.config.js
```

#### Integration Test Coverage

- **CLI Command Execution**: Real command-line invocation with process spawn and timeout handling
- **Exit Code Validation**: Proper exit codes for success/failure scenarios  
- **Output Format Testing**: CLI, JSON, and GitHub comment output formats
- **Flag Validation**: Command-line argument parsing and validation
- **Error Handling**: Invalid commands, malformed flags, and edge cases
- **Performance**: Memory usage and execution time limits with 30-second timeouts
- **Resource Management**: Proper cleanup of spawned processes and temporary files
- **Backwards Compatibility**: Legacy usage patterns and deprecated flags

#### Test Infrastructure

- **Enhanced Jest Configuration**: 30-second timeouts, proper async handling, resource cleanup
- **Global Test Utilities**: `withTimeout`, `spawnWithCleanup`, `createTempDir` for robust testing
- **Isolation**: Each test runs in isolation with proper setup/teardown procedures
- **Performance Monitoring**: Resource leak detection and performance benchmarking

#### Test Structure

- `integration_tests/cli_scripts.integration.test.ts` - Main CLI functionality tests
- `integration_tests/cli_error_scenarios.integration.test.ts` - Error handling and edge cases
- `integration_tests/cache.enhanced.test.ts` - Cache functionality testing
- `integration_tests/performance.integration.test.ts` - Performance and scalability tests
- `integration_tests/__fixtures__/` - Test data and mock OAS files
- `integration_tests/setup.ts` - Global test utilities and cleanup functions

#### Running Specific Test Suites

```bash
# Run only CLI integration tests
yarn test:jest_integration --config src/platform/packages/private/kbn-validate-oas/jest.integration.config.js --testNamePattern="CLI Scripts Integration"

# Run only error scenario tests  
yarn test:jest_integration --config src/platform/packages/private/kbn-validate-oas/jest.integration.config.js --testNamePattern="Error Scenarios"

# Run with verbose output for debugging
yarn test:jest_integration --config src/platform/packages/private/kbn-validate-oas/jest.integration.config.js --verbose
```

### Test Requirements and Success Criteria

- **Timeout Handling**: All tests must complete within 30 seconds
- **Resource Cleanup**: No hanging processes or resource leaks
- **Error Coverage**: Comprehensive error scenario testing
- **Performance Validation**: Memory usage and execution time monitoring

## Usage Examples

### Basic Validation
```typescript
const result = await runEnhancedValidation({
  file: { only: 'serverless' },
  output: { format: 'cli' }
});
```

### Incremental Validation (CI/CD)
```typescript
const result = await runEnhancedValidation({
  incremental: true,
  git: { baseBranch: 'main' },
  output: { format: 'github-comment' }
});
```

### Path-Filtered Validation
```typescript
const result = await runEnhancedValidation({
  file: { 
    only: 'serverless',
    includePaths: ['/paths/~1api~1fleet~1agent_policies']
  },
  output: { format: 'json' }
});
```
