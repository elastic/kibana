/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * MCP Prompts for common Scout workflows
 */

export interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export const PROMPTS: PromptDefinition[] = [
  {
    name: 'generate-new-test',
    description: 'Generate a new Scout test from scratch',
    arguments: [
      {
        name: 'feature_name',
        description: 'Name of the feature being tested',
        required: true,
      },
      {
        name: 'expected_behavior',
        description: 'Expected behavior to test',
        required: true,
      },
      {
        name: 'deployment_type',
        description: 'Deployment type: ess, serverless_security, or both',
        required: false,
      },
      {
        name: 'use_parallel',
        description: 'Whether to use parallel execution (spaceTest)',
        required: false,
      },
    ],
  },
  {
    name: 'generate-page-object',
    description: 'Generate a page object architecture',
    arguments: [
      {
        name: 'page_name',
        description: 'Name of the page object',
        required: true,
      },
      {
        name: 'ui_domains',
        description: 'UI domains to organize (e.g., navigation, forms, messaging)',
        required: false,
      },
      {
        name: 'needs_assertions',
        description: 'Whether to include an assertions class',
        required: false,
      },
    ],
  },
  {
    name: 'migrate-cypress-test',
    description: 'Migrate a Cypress test to Scout',
    arguments: [
      {
        name: 'cypress_file_path',
        description: 'Path to the Cypress test file',
        required: true,
      },
      {
        name: 'migration_approach',
        description: 'Migration approach: phased or incremental',
        required: false,
      },
    ],
  },
  {
    name: 'debug-failing-test',
    description: 'Debug a failing Scout test',
    arguments: [
      {
        name: 'test_file',
        description: 'Path to the failing test file',
        required: true,
      },
      {
        name: 'error_message',
        description: 'Error message from the test failure',
        required: true,
      },
      {
        name: 'failure_point',
        description: 'Description of where the test fails',
        required: false,
      },
    ],
  },
];

export function getPromptMessage(promptName: string, args: Record<string, string>): string {
  switch (promptName) {
    case 'generate-new-test':
      return generateNewTestPrompt(args);
    case 'generate-page-object':
      return generatePageObjectPrompt(args);
    case 'migrate-cypress-test':
      return migrateCypressTestPrompt(args);
    case 'debug-failing-test':
      return debugFailingTestPrompt(args);
    default:
      return 'Unknown prompt';
  }
}

function generateNewTestPrompt(args: Record<string, string>): string {
  const featureName = args.feature_name;
  const expectedBehavior = args.expected_behavior;
  const deploymentType = args.deployment_type || 'both';
  const useParallel = args.use_parallel || 'true';

  const tags =
    deploymentType === 'ess'
      ? "['@ess']"
      : deploymentType === 'serverless_security'
      ? "['@svlSecurity']"
      : "['@ess', '@svlSecurity']";

  return `I want to generate a new Scout test for ${featureName}.

**Test Requirements:**
- Feature: ${featureName}
- Expected Behavior: ${expectedBehavior}
- Deployment Type: ${deploymentType}
- Deployment Tags: ${tags}
- Use Parallel Execution: ${useParallel}

**Steps to Generate:**

0. **FIRST: Analyze test suitability** (IMPORTANT - DO THIS FIRST!)
   - Use scout_analyze_test_suitability to determine if Scout E2E is appropriate
   - Pass testDescription: "${expectedBehavior}"
   - Review the recommendation and reasoning
   - If not recommended for E2E, suggest alternatives to the user
   - Ask user if they want to proceed with Scout or use alternative approach

1. Reference the test patterns (if continuing with Scout):
   - Use scout_list_resources to see available patterns
   - Read scout://patterns/test-writing for test structure
   - Read scout://patterns/fixtures for fixture usage
   - Read scout://patterns/wait-strategies for proper waits
   - Read scout://patterns/test-type-selection for test type guidance

2. Find selectors on the page:
   - Use scout_navigate to go to the relevant page
   - Use scout_find_selectors to identify available testSubj selectors
   - Use scout_snapshot to understand page structure

3. Generate the test:
   - Use scout_generate_test_file with:
     - testName: "${featureName}"
     - description: "${expectedBehavior}"
     - deploymentTags: ${tags}
     - useSpaceTest: ${useParallel}

4. Suggest next steps:
   - What API services might be needed
   - What page objects might be needed
   - How to run the test

Please proceed with these steps.`;
}

function generatePageObjectPrompt(args: Record<string, string>): string {
  const pageName = args.page_name;
  const uiDomains = args.ui_domains || '';
  const needsAssertions = args.needs_assertions || 'true';

  return `I want to generate a page object for ${pageName}.

**Page Object Requirements:**
- Page Name: ${pageName}
- UI Domains: ${uiDomains || 'to be determined'}
- Include Assertions: ${needsAssertions}

**Steps to Generate:**

1. Reference page object patterns:
   - Read scout://patterns/page-objects for architecture patterns
   - Understand the orchestrator + actions + locators + assertions pattern

2. Navigate to the page and analyze:
   - Use scout_navigate to go to the page
   - Use scout_find_selectors to find all testSubj selectors
   - Use scout_snapshot to understand the page structure

3. Design the architecture:
   - Determine if simple or orchestrator pattern is needed
   - Identify action domains (e.g., navigation, messaging, forms)
   - Identify key locators needed

4. Generate the code:
   - Use scout_generate_page_object_code for the main class
   - Generate action classes if using orchestrator pattern
   - Generate locators class
   - Generate assertions class if needed

5. Provide usage examples and next steps

Please proceed with these steps.`;
}

function migrateCypressTestPrompt(args: Record<string, string>): string {
  const cypressFilePath = args.cypress_file_path;
  const migrationApproach = args.migration_approach || 'phased';

  return `I want to migrate a Cypress test to Scout.

**Migration Requirements:**
- Cypress File: ${cypressFilePath}
- Migration Approach: ${migrationApproach}

**Steps to Migrate:**

1. **FIRST: Analyze the Cypress test** (IMPORTANT - INCLUDES SUITABILITY & COVERAGE CHECK!)
   - Read the Cypress test file
   - Use scout_analyze_cypress_patterns with checkCoverage=true to identify patterns AND check existing coverage
   - **This will automatically check:**
     - If the test should be E2E (suitability analysis)
     - If functionality is already tested elsewhere (coverage analysis)
   - Review the suitability analysis, coverage analysis, and any warnings
   - **Decision logic:**
     - If coverageAnalysis.recommendation === 'skip': Test is redundant, suggest deletion
     - If coverageAnalysis.recommendation === 'generate_unit': Generate unit test instead
     - If coverageAnalysis.recommendation === 'generate_integration': Generate integration test instead
     - If coverageAnalysis.recommendation === 'migrate_e2e': Proceed with Scout migration
     - If coverageAnalysis.recommendation === 'split': Split into multiple test types
   - If test should be unit/integration and not covered, use scout_generate_unit_or_integration_test
   - If test should be E2E and not redundant, proceed with migration
   - Identify: screens, tasks, API calls, custom commands

2. Reference patterns (if continuing with Scout):
   - Read scout://migration/cypress-patterns for mappings
   - Read scout://migration/common-pitfalls for issues to avoid
   - Read scout://patterns/test-type-selection for test type guidance

3. Check for existing infrastructure (AVOID DUPLICATION!):
   - Use scout_find_existing_files to search for existing page objects
   - Use scout_find_existing_files to search for existing API services
   - Suggest reusing existing code when possible

4. Create dependencies:
   - For each needed API service:
     - Use scout_generate_api_service_code to generate code
     - Use scout_suggest_file_location to get proper path
     - Use scout_write_file to save the file
   - For each needed page object:
     - Use scout_generate_page_object_code to generate code
     - Use scout_suggest_file_location to get proper path
     - Use scout_write_file to save the file

5. Convert the test:
   - Convert test structure (describe → test.describe)
   - Convert selectors using scout_convert_cypress_command
   - Add deployment tags
   - Add space isolation if needed
   - Use scout_suggest_file_location to get test path
   - Use scout_write_file to save the test

6. **VALIDATE: Run the test!**
   - Use scout_run_test to execute the migrated test
   - If test fails:
     - Use scout_suggest_fix to diagnose issues
     - Fix the code
     - Use scout_write_file to update files
     - Re-run with scout_run_test
   - Repeat until test passes

7. Report success:
   - ✅ Show all files created
   - ✅ Show test results (passed/failed)
   - ✅ Provide next steps

Please proceed with these steps.`;
}

function debugFailingTestPrompt(args: Record<string, string>): string {
  const testFile = args.test_file;
  const errorMessage = args.error_message;
  const failurePoint = args.failure_point || 'unknown';

  return `I need help debugging a failing Scout test.

**Test Information:**
- Test File: ${testFile}
- Error Message: ${errorMessage}
- Failure Point: ${failurePoint}

**Steps to Debug:**

1. Analyze the error:
   - Use scout_suggest_fix to get initial suggestions
   - Determine error type (timeout, selector, assertion, etc.)

2. Gather debugging information:
   - Use scout_get_console_logs to check for JavaScript errors
   - Use scout_get_network_activity to check for failed requests
   - Use scout_analyze_wait_failure if it's a timeout

3. Reference debugging patterns:
   - Read scout://patterns/wait-strategies for timeout issues
   - Read scout://patterns/test-writing for common patterns

4. Provide specific fixes:
   - Show the problematic code
   - Suggest corrected code
   - Explain why the fix works

5. Suggest testing approach:
   - How to run the test in debug mode
   - What to check at failure point
   - How to prevent this issue in future

Please proceed with these steps.`;
}
