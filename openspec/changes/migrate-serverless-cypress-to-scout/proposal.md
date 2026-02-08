# Migrate Serverless Cypress Tests to Scout

## Problem

The Osquery plugin has 27 Cypress end-to-end tests. While 17 have been fully migrated to Scout/Playwright, **10 remain as empty stubs** with only `// TODO` comments, **3 tests inside an implemented file are stubs**, **2 sub-describes are missing** from an otherwise-complete file, and **1 file has a missing serverless tag**.

This means roughly 40% of the Cypress test logic has not been translated to Playwright yet, blocking the eventual removal of Cypress from Osquery.

## Intent

Translate all remaining Cypress test logic into Playwright, ensuring 1:1 coverage. Tests that are skipped in Cypress (`describe.skip` due to flakiness or complexity) will remain `test.describe.skip` in Scout, but with **real implementations** ready to enable — not empty stubs.

## Scope

### In Scope

1. **10 stub files** — full Playwright implementations replacing `// TODO` placeholders
2. **3 skipped test stubs** in `alerts_multiple_agents.spec.ts`
3. **2 missing sub-describes** in `packs_create_edit.spec.ts` (Lens and Discover tabs)
4. **1 tag gap** — add `@svlSecurity` to `custom_space.spec.ts` default-space variant
5. Shared helper for tier tests (`checkOsqueryResponseActionsPermissions`)

### Out of Scope

- Enabling tests that are skipped due to flakiness (that's a separate effort)
- Adding Scout product-tier configuration support (tracked separately)
- Modifying existing fully-implemented Scout tests
- Cypress test removal (happens after full validation)

## Approach

- Translate Cypress patterns 1:1 to Playwright using existing Scout page objects and API helpers
- Keep skip status aligned with Cypress (skipped there = skipped here)
- Create a shared helper for the tier test pattern used by 4 files
- Validate locally before committing
