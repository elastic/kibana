# Copilot Assignment Test

This directory contains tests and utilities for validating GitHub Copilot assignment functionality.

## Overview

The copilot assignment test (`copilot_assign_test.js`) validates that GitHub's Copilot integration can properly:

1. **Identify copilot-related issues**: Issues with titles containing "copilot_assign_test" or similar patterns
2. **Assign the Copilot bot**: Automatically assign the GitHub Copilot bot user to relevant issues
3. **Process shadow issues**: Handle test issues created for validation purposes

## Background

This test was created to resolve issue #10241, which was a "copilot assign shadow issue" used to test the assignment automation functionality. Multiple duplicate issues were created to test this system.

## Files

- `copilot_assign_test.js`: Main test script that validates assignment logic
- `workflows/copilot-assign-test.yml`: GitHub workflow that runs the test
- `README.md`: This documentation file

## Running the Test

### Locally
```bash
node .github/copilot_assign_test.js
```

### Via GitHub Actions
The test runs automatically on PRs that modify files in the `.github/` directory.

## Test Coverage

The test validates:

- ✅ Copilot can be assigned to issues with relevant titles
- ✅ Shadow issues are processed correctly
- ✅ Assignment logic works for various title patterns
- ✅ Copilot bot user metadata is handled properly

## Issue Patterns

The following issue title patterns trigger copilot assignment:

- `copilot_assign_test`
- `copilot-assign-test`
- `Resolve ticket #10241 copilot_assign_test`
- Any title containing both "copilot" and "assign"

## Expected Behavior

When the system encounters an issue with a matching pattern:

1. The Copilot bot user should be automatically assigned
2. The issue should be properly categorized as a test/shadow issue
3. No duplicate assignments should occur

## Troubleshooting

If tests fail:

1. Check that the issue title patterns match expected format
2. Verify Copilot bot user data is correct
3. Ensure assignment logic handles edge cases properly

This test infrastructure ensures the copilot assignment automation works reliably for future issues.