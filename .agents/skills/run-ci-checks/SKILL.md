---
name: run-ci-checks
description: Run local CI checks (build, linting, type checking, OAS validation) similar to the Buildkite pipeline. Use when asked to validate changes before pushing or to reproduce CI failures.
---

# Run CI Checks

## Overview

These commands replicate the key CI pipeline checks locally. Run them from the Kibana repo root.

## Available checks

### Build Kibana platform plugins

```bash
node --no-experimental-require-module scripts/build_kibana_platform_plugins.js
```

Builds all platform plugins. Useful to verify plugin builds aren't broken.

### Quick checks

```bash
yarn quick-checks
```

Fast validation checks (file format, license headers, etc.).

### Linting

```bash
yarn lint
```

Runs ESLint and Stylelint across the repo.

### Linting with type information

```bash
node --no-experimental-require-module scripts/eslint_with_types.js
```

Runs ESLint rules that require TypeScript type checking (slower but catches more issues).

### Type check

```bash
yarn test:type_check
```

Runs TypeScript type checking. Scope to a single project for speed:

```bash
yarn test:type_check --project <path-to-tsconfig.json>
```

### OAS snapshot validation

```bash
node --no-experimental-require-module scripts/validate_oas_docs.js
```

Validates OpenAPI specification documentation is up to date.

## Running multiple checks

Run checks sequentially by chaining with `&&`:

```bash
yarn quick-checks && yarn lint && yarn test:type_check
```

Or run them in parallel using background processes:

```bash
yarn quick-checks &
yarn lint &
yarn test:type_check &
wait
```

## Recommended subset for quick validation

For a fast pre-push sanity check, run:

```bash
yarn quick-checks && yarn lint
```

For thorough validation before a PR:

```bash
yarn quick-checks && yarn lint && yarn test:type_check
```
