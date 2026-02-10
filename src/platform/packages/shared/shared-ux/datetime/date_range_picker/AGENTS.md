# AGENTS.md

This file provides guidance to agents when working with code in this folder.

## Project Overview

This is a UI component. It's a date range picker with a "smart input".

- **Only dependencies**: `@elastic/eui`, `@elastic/datemath` and `moment`

## Commands

Run from Kibana root directory.

```bash
# Unit tests
yarn test:jest src/platform/packages/shared/shared-ux/datetime/date_range_picker

# Lint (ESLint) — check
node scripts/eslint.js src/platform/packages/shared/shared-ux/datetime/date_range_picker

# Lint (ESLint) + Format (Prettier) — fix
node scripts/eslint.js --fix src/platform/packages/shared/shared-ux/datetime/date_range_picker

# Storybook
yarn storybook shared_ux
```

## Component Architecture

TODO (input text is source of truth, state flow)

## Rules

1. Avoid complexity in TypeScript types
2. Prefer function declaration over arrow functions
3. Add JSDoc DocBlocks for every top-level function
4. Describe all props in exported types with JSDoc, including @default when not undefined
5. Do not expose `moment` objects in public APIs, we might replace it
6. Keep tests concise

## Philosophy

- Correctness > cleverness
- Real problems only
- Descriptive names > brevity
- Keep PRs small (below 1000 lines)
