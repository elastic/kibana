# @kbn/scout-mcp

Model Context Protocol (MCP) server that exposes Scout's browser testing capabilities to AI assistants like Cursor.

## What This Does

This MCP server allows you to use Scout (Kibana's browser test framework) directly from Cursor to:
- Navigate Kibana and interact with the UI
- Test UI components and user flows using browser automation
- Take screenshots and debug tests
- Run test scenarios interactively

## Quick Setup for Cursor

### 1. Start Scout Server

**MCP requires SAML authentication to be configured.** Start Kibana using Scout's `start-server` command, which pre-configures SAML:

```bash
node scripts/scout.js start-server --stateful
```

This command:
- Starts Elasticsearch and Kibana with SAML authentication pre-configured
- Runs Kibana on port **5620** (default)
- Sets up the mock IdP plugin for local SAML authentication
- Configures the correct SAML realm for testing

**Default URLs:**
- Kibana: `http://localhost:5620`
- Elasticsearch: `http://localhost:9220`

### 2. Configure Cursor MCP

Open Cursor Settings → Features → MCP Servers, or edit:
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`

Add this configuration:

```json
{
  "mcpServers": {
    "scout": {
      "command": "bash",
      "args": [
        "-c",
        "cd /path/to/kibana && npx tsx packages/kbn-scout-mcp/bin/cli.ts --target http://localhost:5620"
      ]
    }
  }
}
```

**Configuration Notes:**
- Replace `/path/to/kibana` with your actual Kibana repository path (use absolute path)
- The default target URL is `http://localhost:5620` (Scout's default port)
- To use a different Kibana instance, change the `--target` URL, but ensure SAML is configured
- The `bash -c` approach is required because Cursor's MCP implementation needs the explicit `cd` command

### 3. Restart Cursor

Completely quit Cursor (Cmd+Q on Mac) and restart it.

### 4. Start Using Scout

In Cursor chat, you can now ask:
- "Navigate to the Discover app"
- "Take a screenshot of the dashboard"
- "Use Scout to interact with the filter bar"

## Available Tools

The MCP server provides these capabilities:

**Browser Automation**
- `scout_navigate` - Navigate to Kibana apps or URLs
- `scout_click` - Click elements
- `scout_type` - Type into input fields
- `scout_wait_for` - Wait for elements or conditions
- `scout_screenshot` - Take screenshots
- `scout_snapshot` - Get page structure

**EUI Components**
- `scout_eui_component` - Interact with Elastic UI components
- `scout_list_eui_components` - See available components

**Authentication** ⭐ IMPROVED
- `scout_login` - Login with any role (with validation and detailed errors)
- `scout_login_as_admin` - Convenience method for admin login
- `scout_login_as_viewer` - Convenience method for viewer login
- `scout_login_as_privileged` - Deployment-aware privileged user login
- `scout_logout` - Logout
- `scout_get_auth_status` - Check auth state with supported roles list

See [AUTHENTICATION.md](./AUTHENTICATION.md) for detailed authentication guide.

**Test Generation** ⭐ NEW
- `scout_generate_test_file` - Generate complete Scout test from session actions
- `scout_suggest_assertions` - Suggest assertions based on current page state
- `scout_find_selectors` - Find all testSubj selectors on current page

**Cypress Migration** ⭐ NEW
- `scout_analyze_cypress_patterns` - Analyze Cypress test and identify patterns
- `scout_convert_cypress_command` - Convert Cypress commands to Scout equivalents
- `scout_generate_migration_plan` - Generate migration plan for Cypress test suite

**Code Generation** ⭐ NEW
- `scout_generate_page_object_code` - Generate page object classes
- `scout_generate_api_service_code` - Generate API service fixtures

**Debugging** ⭐ NEW
- `scout_get_console_logs` - Get browser console logs from session
- `scout_get_network_activity` - Get network requests/responses
- `scout_compare_snapshots` - Compare expected vs actual page state
- `scout_suggest_fix` - Suggest fixes for common test failures
- `scout_analyze_wait_failure` - Analyze timeout/wait failures

**Test Analysis** ⭐ NEW
- `scout_analyze_test_suitability` - Analyze if test should be Scout E2E, integration, or unit test
  - Evaluates test goals and complexity
  - Recommends most appropriate test type
  - Explains reasoning and trade-offs
  - Provides examples for each test type
  - Helps build optimal test pyramid

**Test Execution** ⭐ NEW
- `scout_run_test` - Run a Scout test and get immediate results
  - Execute tests with tags, headed mode, debug mode
  - Get structured test results (passed/failed, duration, errors)
  - Validate migrations immediately
  - Complete the development loop: generate → run → debug → fix
- `scout_watch_test` - Watch test file and re-run on changes
- `scout_get_test_results` - Get results from last test execution

**File Operations** ⭐ NEW
- `scout_write_file` - Write generated code to files
  - Automatically create directories
  - Proper file structure
  - No more copy-paste!
- `scout_read_file` - Read existing files
- `scout_suggest_file_location` - Get proper file path based on Scout conventions
  - Knows Scout directory structure
  - Suggests by file type (test, pageObject, apiService)
  - Handles different scopes (security, platform, observability)
- `scout_find_existing_files` - Find existing page objects, API services, tests
  - Prevent duplicate code
  - Encourage reuse
  - Learn from existing patterns

## Knowledge Base (Resources)

Scout MCP exposes a comprehensive knowledge base about Scout testing patterns:

**Test Patterns**
- `scout://patterns/test-writing` - Test structure and best practices from real tests
- `scout://patterns/fixtures` - Fixture usage (worker vs test scope)
- `scout://patterns/page-objects` - Multi-class page object architecture
- `scout://patterns/wait-strategies` - Wait strategies and TIMEOUTS patterns
- `scout://patterns/test-type-selection` - Guide for choosing between unit, integration, and E2E tests ⭐ NEW

**Migration Guides**
- `scout://migration/cypress-patterns` - Cypress to Scout pattern mappings
- `scout://migration/common-pitfalls` - Common migration pitfalls

AI assistants can reference these resources to understand Scout patterns and generate high-quality code.

## Workflow Prompts

Scout MCP provides guided workflows for common tasks:

**generate-new-test**
- Guided workflow for creating a new Scout test from scratch
- Asks for: feature name, expected behavior, deployment type
- Uses resources and tools to generate complete test file

**generate-page-object**
- Guided workflow for creating page object architecture
- Asks for: page name, UI domains, needs assertions
- Generates orchestrator + actions + locators + assertions classes

**migrate-cypress-test**
- Guided workflow for Cypress to Scout migration
- Asks for: Cypress file path, migration approach
- Analyzes dependencies and generates Scout equivalents

**debug-failing-test**
- Guided workflow for debugging test failures
- Asks for: test file, error message, failure point
- Uses debugging tools to diagnose and suggest fixes

## Example Workflows

### Workflow 1: Generate a New Scout Test

```
You: I want to generate a new test for the Alerts feature.
     It should verify that alerts are displayed correctly in the table.
     This should work on both ESS and Serverless.

AI will:
1. Reference scout://patterns/test-writing for test structure
2. Navigate to the Alerts page
3. Use scout_find_selectors to identify testSubj selectors
4. Use scout_generate_test_file to create the test
5. Provide the complete test file with proper structure
```

### Workflow 2: Complete Migration (NEW! 🚀)

```
You: Help me migrate this Cypress test to Scout:
     [paste Cypress test code]

AI will:
1. Analyze test suitability (includes automatic check)
   → ✅ Suitable for Scout E2E

2. Check for existing code
   → scout_find_existing_files("alerts")
   → Found: AlertsTablePage (will reuse!)

3. Generate API service
   → scout_generate_api_service_code
   → scout_suggest_file_location
   → scout_write_file
   ✅ Created: fixtures/services/detection_rule_service.ts

4. Generate test
   → Convert with scout_convert_cypress_command
   → scout_suggest_file_location
   → scout_write_file
   ✅ Created: tests/alerts_table.spec.ts

5. RUN THE TEST!
   → scout_run_test({ testPath: "tests/alerts_table.spec.ts" })
   ❌ Test failed: Timeout waiting for alertsTable

6. Auto-fix and retry
   → scout_suggest_fix
   → Update wait strategy
   → scout_write_file (update test)
   → scout_run_test (retry)
   ✅ Test passed! (2.3s, 3/3 tests)

🎉 Migration complete and validated!

Files created:
- fixtures/services/detection_rule_service.ts
- tests/alerts_table.spec.ts

Next steps:
- Add space isolation for parallel execution
- Run full test suite
- Commit changes
```

### Workflow 3: Debug a Failing Test

```
You: My test is failing with "Timeout waiting for element".
     The test tries to find data-test-subj="alertsTable"

AI will:
1. Use scout_get_console_logs to check for JavaScript errors
2. Use scout_analyze_wait_failure to diagnose the timeout
3. Use scout_suggest_fix to provide specific solutions
4. Reference scout://patterns/wait-strategies for best practices
5. Provide corrected code with proper wait strategies
```

### Workflow 4: Create Page Objects

```
You: Create a page object for the Rules Management page with navigation,
     rule selection, and assertions

AI will:
1. Navigate to the Rules Management page
2. Use scout_find_selectors to identify all testSubj selectors
3. Reference scout://patterns/page-objects for architecture
4. Use scout_generate_page_object_code for orchestrator class
5. Generate action classes, locators class, and assertions class
6. Provide complete page object architecture
```

### Workflow 5: Analyze Test Suitability ⭐ NEW

```
You: I want to test that the calculateRiskScore function returns the correct value.
     Should this be a Scout E2E test?

AI will:
1. Use scout_analyze_test_suitability with your test description
2. Analyze what's being tested (pure function)
3. Recommend test type (Unit test in this case)
4. Explain reasoning:
   ✓ Pure function with no side effects
   ✓ No browser interaction needed
   ✓ Fast to run (< 1s)
   ✓ Easy to maintain
5. Provide example unit test code
6. Show speed/maintenance comparisons
```

**Example Analysis Output:**

```
⚠️ Analysis Results:
- Recommended: Unit Test (Jest)
- Confidence: High
- This test is for a pure function

Reasoning:
✓ Pure function with no side effects
✓ No browser interaction needed
✓ No API calls needed
✓ 10x faster as unit test (< 1s vs 30s)
✓ Easier to maintain and debug

Example Unit Test:
describe('calculateRiskScore', () => {
  it('should sum alert severities', () => {
    const alerts = [{ severity: 5 }, { severity: 3 }];
    expect(calculateRiskScore(alerts)).toBe(8);
  });
});

Would you like to:
1. Generate unit test instead (RECOMMENDED)
2. Proceed with Scout E2E anyway
3. See more examples
```

**When migrating Cypress tests:**

```
You: Help me migrate this Cypress test to Scout:
     [test that only calls cy.request() for API validation]

AI will:
1. Use scout_analyze_cypress_patterns (includes suitability check)
2. Detect: Test only makes API calls, no UI interaction
3. Recommend: Integration test (FTR) instead of Scout E2E
4. Explain: 5x faster, more focused, easier to maintain
5. Ask if you want to proceed with Scout or create integration test
```

**Benefits of Test Analysis:**
- ✅ Prevents over-testing with E2E when unit/integration would work
- ✅ Builds optimal test pyramid (many unit, some integration, few E2E)
- ✅ Faster test suites and CI runs
- ✅ Educates developers on test type trade-offs

## Complete Development Loop Example

### Before (Old Workflow):
```
1. Generate code in AI chat
2. Copy-paste into files
3. Manually create directories
4. Open terminal
5. Run test command
6. Test fails
7. Go back to AI, describe error
8. Get fix suggestion
9. Copy-paste fix
10. Run test again
... repeat ...
```

### After (New Workflow with Test Execution & File Ops):
```
You: Migrate this Cypress test to Scout and make sure it works

AI in Cursor:
1. Analyzes test ✅
2. Generates code ✅
3. Writes files to disk ✅
4. Runs the test ⚡
5. Test fails → Auto-suggests fix
6. Updates files ✅
7. Re-runs test ⚡
8. Test passes ✅
9. Done! 🎉

All in one conversation, no manual steps!
```

## Example Usage in Cursor

```
You: Navigate to Discover and add a filter for field "status" equals "200"

Cursor will use Scout MCP to:
1. Navigate to the Discover app
2. Click the add filter button and fill in the filter details
3. Verify the filter is applied
```

```
You: Take a screenshot of the current Dashboard page

Cursor will use Scout to capture and save the screenshot
```

```
You: Generate a test for alerts table, write it to the right location, and run it

Cursor will:
1. Generate the test code
2. Suggest proper file location based on conventions
3. Write the file (creates directories automatically)
4. Run the test with scout_run_test
5. Show you the results
```

## Debugging Failed Tests

When a test fails, use Scout MCP to debug interactively in Cursor:

```
My test is failing. Use Scout to:
1. Take a screenshot
2. Get current URL and page title
3. Check if I'm logged in
4. Get a page snapshot
```

Scout provides powerful debugging tools:
- **Screenshots** - See the actual page state
- **Page snapshots** - Inspect DOM structure and find correct selectors
- **State inspection** - Check URL, auth status, error messages
- **Step-by-step execution** - Run test incrementally with screenshots

## Authentication Improvements

The authentication system has been enhanced with several key improvements:

### Session Management
- **Session Caching**: SAML sessions are cached by role for better performance
- **Unique Custom Roles**: Each custom role gets a unique name to prevent conflicts
- **Automatic Cleanup**: Custom roles are automatically deleted when switching roles or closing the session

### Role Validation
- Roles are validated before authentication
- Clear error messages list available roles
- Supports custom roles with flexible permission sets

### Convenience Methods
- `scout_login_as_admin()` - Quick admin login
- `scout_login_as_viewer()` - Quick viewer login
- `scout_login_as_privileged()` - Deployment-aware privileged login (editor/developer)

### Error Handling
- Detailed SAML authentication errors
- List of available roles in error messages
- Validation for unsupported roles
- Stack traces for debugging

### Example: Custom Role Login
```typescript
// Login with custom role for testing specific permissions
scout_login({
  role: 'custom',
  customRole: {
    kibana: [{
      spaces: ['*'],
      feature: { discover: ['read'], dashboard: ['all'] }
    }],
    elasticsearch: {
      cluster: ['monitor'],
      indices: [{ names: ['my-index-*'], privileges: ['read'] }]
    }
  }
})
```

For more details, see [AUTHENTICATION.md](./AUTHENTICATION.md).

## Troubleshooting

**"No server info found"**
- Verify the Kibana path in your MCP config is correct (in the `cd` command)
- Make sure Kibana repository exists at that path
- Check Cursor logs for detailed errors

**"Cannot find module" or "ERR_MODULE_NOT_FOUND"**
- Verify the path in the `cd` command is correct
- Run `yarn kbn bootstrap` from Kibana root directory
- Make sure you're using the `bash -c` command format shown above

**Git repository errors**
- Ensure the path in the `cd` command points to your Kibana repo root

## License

Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0
