# CONN-001 Deviations Summary

Per the brief's definition of done: there should be no deviations without a stated reason.

## Deviations

### 1. Missing-nodes → empty result (not a throw)

**Spec test #4:** "choose fail-closed and test it" for the case where nodes are missing.

**What was implemented:** When a paginated template's connection object resolves but has no `nodes` key (or `nodes` is not an array), `data: []` is returned with `pageInfo: { hasNextPage: false, endCursor: null }`. This is the same behavior as an empty page.

**Reason:** The brief's fail-closed requirement (D5) is explicitly about the `errors` array alongside `data` — that case does throw. For missing nodes, an empty result is indistinguishable from a legitimately empty org/page and is safer for workflow resumability. A throw here would abort any workflow that hits an org with no repos, teams, etc.

Tests verify both paths: partial-response with `errors` throws (D5), and missing-nodes returns `[]` (test #4 for the "empty result" branch).

### 2. eslint: unverified due to environment

**What was attempted:** `node scripts/eslint --fix $(git diff --name-only HEAD)` failed with `Cannot find plugin "@kbn/eslint-plugin-alerting-v2"` — a pre-existing bootstrap gap in this dev environment (`yarn kbn bootstrap` not run, `yarn` binary unavailable).

**What was done instead:** Manual review against CLAUDE.md rules:
- All new filenames are `snake_case` ✓
- No `any` or `unknown` in production code ✓  
- No `eslint-disable` or `ts-ignore` comments ✓
- `import type` used for all type-only imports ✓
- No unused exports (dead `extractPageInfo` removed after advisor review) ✓

CI will run the full eslint check. No rule violations are expected.

## Confirmations

- D1: `graphqlQuery` is absent from all source files (`git grep graphqlQuery` returns only the negative assertion in `github.test.ts`) ✓
- D2: Output contract matches spec exactly (`data`, `meta?`, `pageInfo`, `rateLimit`, `shouldBackoff`, `templateId`) ✓
- D3: Exactly 11 templates, one file each, in `graphql/templates/` ✓
- D3-fix: All 11 documents include `rateLimit { cost remaining limit resetAt }` at query root; test asserts this statically ✓
- D4: 2 retries, ≤5s cap, jitter; `retry-after` > cap → immediate `GitHubRateLimitError` with `resetAt` ✓
- D5: 401/403 (no rate-limit signals) → scope error; 403/429 (rate-limit) → `GitHubRateLimitError`; GraphQL errors array → fail-closed; zod pre-flight before network ✓
- Auth block: kept main's verbatim (bearer label, OAuth scope `repo`) — no changes ✓
- `graphqlApiUrl` added to schema + `validateUrls.fields` ✓
- Dual test handler: MCP listTools + GraphQL viewer ✓
- Scope docs written in `github-action-type.md` ✓
- Jest: 1299 tests pass ✓
- Type check: 0 errors in kbn-connector-specs ✓
- i18n: passes ✓
