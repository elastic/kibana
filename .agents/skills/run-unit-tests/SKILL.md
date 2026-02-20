---
name: run-unit-tests
description: Run Jest unit tests for changed files or a specific package, with optional coverage and JSON output. Use when asked to run, debug, or check unit test results.
---

# Run Unit Tests

## Overview

Kibana uses Jest for unit tests. Each package/plugin has its own `jest.config.js`. This skill provides a helper script that replicates the full test runner logic, plus standalone commands for simpler use cases.

## Helper script

Run from the repo root:

```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/run-unit-tests/run_changed_tests.ts
```

Options:
- `--package <id>` -- run all tests for a specific package (accepts package ID like `@kbn/std`, relative directory path, or partial name)
- `--coverage` -- collect code coverage (writes `coverage-summary.json` and `coverage-final.json`)
- `--no-verbose` -- truncate failure messages (default: full messages)

Without `--package`, the script finds changed files via `git diff` and runs related tests automatically.

Output: JSON with `success`, `message`, and `results[]` (per-package test suites with assertion-level detail).

### Examples

Run tests for changed files:
```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/run-unit-tests/run_changed_tests.ts
```

Run tests for a specific package:
```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/run-unit-tests/run_changed_tests.ts --package @kbn/std
```

Run with coverage:
```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/run-unit-tests/run_changed_tests.ts --package @kbn/std --coverage
```

## Standalone commands (simpler alternatives)

For quick one-off usage without the helper script:

### Run tests for a specific file

```bash
yarn test:jest <path-to-test-file>
```

### Run tests for a specific package

```bash
yarn test:jest --config <path-to-package>/jest.config.js
```

Only one `--config` per invocation. To test multiple packages, run separate commands.
