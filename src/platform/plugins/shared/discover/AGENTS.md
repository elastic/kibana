---
title: Discover Application Guide for Agents
---

# Discover Application Guide

This document captures practical guidance for working in the Discover plugin. It is optimized for agent-driven development and code review.

## Scope and goals

Discover is the core data exploration app in Kibana and includes the saved search embeddable. Changes here must preserve data correctness, query/state behavior, and consistent user experience across solutions.

## Key concepts

### 1) Discover context awareness (profiles)
Discover adapts UI and behavior based on context via composable profiles:
- **Root context** (solution)
- **Data source context** (ES|QL query or data view)
- **Document context** (per-row record)

Profiles implement extension points (cell renderers, doc viewer, app menu, etc.) and are composed in order. Start here:
- Extension point definitions: `public/context_awareness/types.ts`
- Inventory of extension points: `public/context_awareness/EXTENSION_POINTS_INVENTORY.md`
- Architecture overview: `public/context_awareness/README.md`

### 2) Plugin structure and entry points
- Plugin manifest: `kibana.jsonc`
- Plugin setup/start: `public/plugin.tsx`
- App routes: `public/application/*`
  - `public/application/main` for the primary Discover table
  - `public/application/context` for surrounding documents
  - `public/application/doc` for single document view
- Shared UI: `public/components`, `public/hooks`, `public/utils`
- Embeddable: `public/embeddable`
- Shared code: `common/`
- Server-side: `server/`

## Change guidance

### Feature flags
Discover feature flags are defined in `public/constants.ts`. Use `discover.experimental.enabledProfiles` to enable experimental profiles via `kibana.yml`.

### Profiles and providers
Profile providers live in `public/context_awareness/profile_providers`. Register providers in:
- `public/context_awareness/profile_providers/register_profile_providers.ts`

Prefer dedicated provider folders per solution (e.g. `security`) and keep providers focused to a specific context level.

### Dependency constraints
Discover is a shared plugin and cannot depend directly on solution plugins. If you need solution-owned logic, prefer:
- Local implementations inside Discover with shared ownership
- Dedicated shared packages
- `discover_shared` plugin as a last-resort IoC bridge

## Testing and verification

### Unit tests (Jest)
Co-locate with code under `public/` and `common/`.
Example:
- `yarn test:jest src/platform/plugins/shared/discover`

### Functional tests (FTR)
Primary Discover suites:
- `src/platform/test/functional/apps/discover/context_awareness`
- `src/platform/test/functional/apps/discover/esql`
Example:
- `node scripts/functional_test_runner --config src/platform/test/functional/apps/discover/esql/config.ts`

Serverless suites:
- `x-pack/solutions/observability/test/serverless/functional/test_suites/discover/context_awareness`
- `x-pack/platform/test/serverless/functional/test_suites/discover`

### E2E tests
For new end-to-end tests, prefer Scout/Playwright over FTR.

### Verifier
If a verifier sub-agent exists (e.g., `kibana-verifier` or `verifier`), run it and include its findings in the review/test notes.

## Escalation
If changes require cross-plugin behavior or ownership changes, coordinate with the owning team(s) for those plugins before finalizing.

## Review checklist (Discover-specific)

- ES|QL query state and URL syncing are preserved
- Profile resolution still matches expected data sources
- Extension points compose correctly (no regressions in merged accessors)
- Default columns, chart sections, and doc viewer tabs behave per workflow docs
- FTR and serverless suites were considered for user-facing changes

## References

- Discover plugin README: `src/platform/plugins/shared/discover/README.md`
- Context awareness overview: `src/platform/plugins/shared/discover/public/context_awareness/README.md`
