# FLEET-001 — Evidence Pack

**Board:** elastic/kibana#275995 (project 2511, P1, Epic 1 Fleet)
**Branch:** `vp/sdlc-visibility-poc` off `upstream/main` @ `b23c1d9cbbce`
**Worktree:** `~/Projects/kibana.worktrees/visibility-platform`
**Status:** implemented; **all gates green**
**No PR opened. No push to elastic/kibana. No writes to project 2511.**

---

## Goal

Fleet substitutes any `REPLACE_WITH_{VAR_NAME}` placeholder in packaged workflow/agent
YAML at install time, derived **by convention** from the package manifest's `vars[]`,
so onboarding a new integration needs **zero Fleet code changes**.

## Definition of done vs actual

| # | DoD item | Status | Evidence |
|---|---|---|---|
| 1 | Convention-based substitution, no package-specific constants | met | `getPlaceholderForVarName()` derives via `toUpperCase()`; `LEGACY_VAR_PLACEHOLDER_OVERRIDES` removed |
| 2 | `multi: true` comma-join + missing-var guard | met | `formatManifestVarForSubstitution()`; `logger.warn` once per unresolved placeholder |
| 3 | Unit tests: single, multi, missing, unknown | met | 19 tests, all passing |
| 4 | Second non-SDLC fixture proving reuse | met | Jira/Confluence fixture + break-guard test |

## Files changed (9)

```
M x-pack/platform/plugins/shared/fleet/common/types/models/epm.ts
M x-pack/platform/plugins/shared/fleet/kibana.jsonc
M x-pack/platform/plugins/shared/fleet/server/plugin.ts
M x-pack/platform/plugins/shared/fleet/server/services/app_context.ts
M x-pack/platform/plugins/shared/fleet/server/services/epm/kibana/assets/install.ts
M .../install_state_machine/_state_machine_package_install.ts
M .../install_state_machine/steps/index.ts
M x-pack/platform/plugins/shared/fleet/tsconfig.json
A .../install_state_machine/steps/step_install_workflow_assets.ts       (230 lines)
A .../install_state_machine/steps/step_install_workflow_assets.test.ts  (316 lines)
```

## Core mechanism

```ts
const VAR_PLACEHOLDER_PREFIX = 'REPLACE_WITH_';

const getPlaceholderForVarName = (varName: string): string =>
  `${VAR_PLACEHOLDER_PREFIX}${varName.toUpperCase()}`;
```

Substitutions are sorted **longest-first** so a shorter placeholder that is a prefix of a
longer one cannot shadow it (`REPLACE_WITH_ORG` vs `REPLACE_WITH_ORG_LOGIN`). Result is
insertion-order independent — both properties are covered by tests.

Wiring: `KibanaAssetType.workflow` / `.agent` added; new state-machine transition
`create_workflow_assets` → `stepInstallWorkflowAssets`.

## Gate results (all green)

```
jest       195/195 passed, 9 suites, 3 snapshots
eslint     ✅ no eslint errors found  (all 14 changed .ts/.tsx files)
typecheck  info [tsc] exited with 0 after 24.7 seconds
```

Jest covers the new suite (19 tests) plus the two pre-existing suites whose fixtures
this change touches, so the blast radius is verified, not assumed.

### Type-level fallout, found and fixed

Adding `workflow` to `KibanaAssetType` made `KibanaAssetTypeToParts` demand the new key
everywhere it is exhaustively enumerated. Typecheck surfaced 5 `TS2741` errors in files
Shuri never touched:

```
.storybook/context/fixtures/integration.nginx.ts:59
.storybook/context/fixtures/integration.okta.ts:45
common/services/package_to_package_policy.test.ts:67
public/applications/integrations/sections/epm/constants.tsx:22
server/routes/epm/index.test.ts:192
```

Four needed a `workflow: []` entry; `constants.tsx` needed an i18n title
(`xpack.fleet.epm.assetTitles.workflows` → "Workflows"). These are the real cost of
widening a union type — exactly what a typecheck gate exists to catch. Total changed
files: 9 → 14.

## Reuse proof (DoD item 4)

A second package using only the convention — no Fleet code changes:

```yaml
config:
  jiraConnectorId: REPLACE_WITH_JIRA_CONNECTOR_ID
  confluenceConnectorId: REPLACE_WITH_CONFLUENCE_CONNECTOR_ID
  projectKeys: REPLACE_WITH_JIRA_PROJECT_KEYS
```

resolves from `{ jira_connector_id, confluence_connector_id, jira_project_keys: ['PROJ','TEAM'] }`
to `jira-conn-1`, `confluence-conn-2`, `PROJ,TEAM`. A companion break-guard test fails if
the convention logic is removed, so the proof cannot silently rot.

## Correction to the ticket's premise

The ticket said the asset-type bridge lives on Yuliia's POC branch (#272628). It does not.
Verified with a positive control so the negative could be trusted:

```
git cat-file -e yul/…:…/step_install_workflow_assets.ts  → rc=128 (absent)
git cat-file -e yul/…:…/fleet/kibana.jsonc               → rc=0   (control passes)
```

`KibanaAssetType` on Yuliia's branch has no `workflow` member. The bridge actually lives on
`sdlc/integration` @ `75ed3eef261e`. The board's "POC status: Done" for FLEET-008/009 does
not reflect `upstream/main`.

## Environment note (not a code defect)

`node scripts/jest` is broken in the `worker-m1max` **main checkout** — `Cannot find module
'@kbn/babel-register'`. Confirmed pre-existing by running the same command in the main
checkout as a control. Cause: `~/Projects/kibana/.node-version` is `24.14.1` while the
worktree requires `24.19.0`, and the worktree symlinks `node_modules` to main. That
checkout has 217 dirty files, so it was left untouched.

Gates were therefore run on the **M4**, where the worktree was bootstrapped standalone on
Node 24.19.0. Both hosts now carry identical linted code.

## Not done

- No PR, no push, no board writes — awaiting team approval.
- Integration/e2e install path not exercised; unit-level only.
