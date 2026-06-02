# Migration Halted — Phase 5 Environment Blocker

Phases 0–4 of the visualize-listing → Content List migration are
committed on this branch. Phase 5 (before/after screenshots) cannot run
inside this remote execution environment.

## What Stopped Phase 5

- Playwright browser downloads are blocked
  (`yarn kbn bootstrap` failed at `playwright install` with HTTP 403
  from `cdn.playwright.dev`: "Host not in allowlist").
- The seeded-screenshot subagent the skill defines runs Scout first,
  then falls back to a direct Playwright script; both paths require a
  local chromium binary, neither path is recoverable here.
- Seeding itself is fine — the inventory's data sources
  (`src/platform/test/functional/fixtures/kbn_archiver/visualize.json`
  + the `logstash_functional` esArchive) are present, but no renderer
  is available to capture the PNGs.

## What's Already on the Branch

- Phase 0 — `INVENTORY.md` (`4584e5096`)
- Phase 1 — Structural migration (`ceecb0c0e`)
- Phase 2 — i18n cleanup / dedup (`7bbd7e7f9`)
- Phase 3 — Jest unit tests (`adecf27e4`)
- Phase 4 — Scout scaffold + ported FTR coverage (forthcoming commit)

Phases 0–4 pass `node scripts/type_check --project
src/platform/plugins/shared/visualizations/tsconfig.json` and
`node scripts/eslint --fix` on all modified files; Phase 3 also passes
`node scripts/jest` on the new test file.

The Scout specs in `test/scout/ui/parallel_tests/` were typechecked but
NOT executed (no chromium, no live Kibana). Run locally with:

```
node scripts/scout run-tests --arch stateful --domain classic \
  --config src/platform/plugins/shared/visualizations/test/scout/ui/parallel.playwright.config.ts
```

## Resolution

To finish Phase 5, the developer needs to do one of:

1. **Run Phase 5 locally** where `yarn kbn bootstrap` completes
   (Playwright chromium downloads succeed) and a Kibana dev server +
   ES are available. Then re-invoke the skill on this branch — the
   door check accepts `content-list/migration/visualizations/visualize`,
   `git log --oneline` identifies Phases 0–4 as complete, and the
   runner picks up at Phase 5.

2. **Manually approve an empty-state screenshot** by editing
   `INVENTORY.md`'s test data sources row to `accept-empty-state`
   (per the skill's documented override) and re-invoking. The PR will
   ship with an empty-state screenshot only.

`Resolution:` <fill in one of the options above before re-running>
