# AGENTS.md

This file provides guidance to agents when working with code in this folder.

## Project Overview

This is a UI component. It's a date range picker with a "smart input".

- **Only dependencies**: `@elastic/eui`, `@elastic/datemath`, `@kbn/i18n` and `moment`

## Commands

Run from Kibana root directory.

```bash
# Unit tests
yarn test:jest src/platform/packages/shared/shared-ux/datetime/kbn-date-range-picker

# Lint (ESLint) — check
node scripts/eslint.js src/platform/packages/shared/shared-ux/datetime/kbn-date-range-picker

# Lint (ESLint) + Format (Prettier) — fix
node scripts/eslint.js --fix src/platform/packages/shared/shared-ux/datetime/kbn-date-range-picker

# Check types
yarn test:type_check --project src/platform/packages/shared/shared-ux/datetime/kbn-date-range-picker/tsconfig.json

# Storybook
yarn storybook shared_ux
```

## Rules

1. Avoid complexity in TypeScript types
2. Add JSDoc DocBlocks for every top-level function
3. Describe all props in exported types with JSDoc, including @default when not undefined
4. Do not expose `moment` objects in public APIs, we might replace it
5. Keep tests concise

## Philosophy

- Correctness > cleverness
- Real problems only
- Descriptive names > brevity
- Keep PRs small (below 1000 lines)
