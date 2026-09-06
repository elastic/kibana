# Implementation Brief: GitHub GraphQL Ingest Plane (CONN-001)

**Issue:** https://github.com/elastic/kibana/issues/276061
**Scope:** Phase 1 only — production-hardened connector code + unit tests + docs, delivered as a clean branch off `main`. Phase 2 (e2e validation against a real GitHub org) is a separate, supervised session and is NOT part of this brief.

## Goal

Harden the POC GraphQL ingest module from branch `sdlc-poc` into the `.github` connector on `main`. All architectural decisions are already made (see Decisions below) — do not re-litigate them. Your job is faithful execution with tests.

## Source material

- **Target (base your branch on `main`):** `src/platform/packages/shared/kbn-connector-specs/src/specs/github/` — currently an MCP-only connector (no GraphQL).
- **POC to port from (branch `sdlc-poc`):** same path, plus a `graphql/` subfolder (8 files, ~1,065 lines) and wiring in `github.ts`. Read it all before starting:
  - `graphql/github_graphql_client.ts` — axios client, retry loop, pageInfo extraction
  - `graphql/templates.ts` — 11 query templates + catalog lookup
  - `graphql/types.ts` — contract interfaces
  - `graphql/validate_read_only_query.ts` — regex mutation/subscription rejection
  - `graphql/index.ts`, plus `*.test.ts` files
  - `github.ts` on that branch — three actions (`graphqlQuery`, `runQueryTemplate`, `listQueryTemplates`), `graphqlApiUrl` config field, dual MCP+GraphQL `test` handler

To view POC files without switching branches: `git show sdlc-poc:src/platform/packages/shared/kbn-connector-specs/src/specs/github/graphql/<file>`

## Decisions (final — implement exactly)

### D1 — Catalog-only: `graphqlQuery` does NOT exist
- Port `runQueryTemplate` and `listQueryTemplates`. Do NOT port the `graphqlQuery` action or its input schema.
- Keep `validate_read_only_query.ts` as internal defense-in-depth, applied to template documents (it is no longer a security boundary, just a safety assertion). Validate template documents **once at module load / in tests**, not on every request.

### D2 — Public output contract (the stability sign-off surface)

```ts
// runQueryTemplate input
{
  templateId: string,            // must match a catalog entry; unknown → typed error listing valid IDs
  variables?: object,            // zod-validated PER TEMPLATE (see D2b)
  first?: number,                // int, 1–100, default 50
  after?: string                 // pagination cursor
}

// runQueryTemplate output — IDENTICAL SHAPE FOR EVERY TEMPLATE
{
  data: unknown[],               // the unwrapped node array (see D2a)
  meta?: Record<string, unknown>,// sibling fields next to the node connection, e.g. search.issueCount
  pageInfo: { hasNextPage: boolean, endCursor: string | null },
  rateLimit: { cost: number, remaining: number, limit: number, resetAt: string },
  shouldBackoff: boolean,        // remaining <= 100 (keep POC's flat threshold, named constant)
  templateId: string             // echoed back
}
```

**D2a — unwrapping.** Each template declares a result path (the POC's `pageInfoPath` generalizes to this). The handler extracts the `nodes` array at that path into `data`, the `pageInfo` object into `pageInfo`, and any scalar/object siblings of the connection (e.g. `issueCount` on `search`) into `meta`. Templates without pagination (`graph.issueGraph`, `graph.pullRequestGraph`) return the single entity wrapped in a one-element array, `pageInfo: { hasNextPage: false, endCursor: null }`.

**D2b — per-template variables schemas.** Every template gets an explicit zod schema for its variables (e.g. `orgCatalog.repos` → `{ org: z.string().min(1) }`; `activity.searchIssues` → `{ query: z.string().min(1) }`; `graph.issueGraph` → `{ owner, repo, number: z.number().int() }`). Validation runs pre-flight; failures produce a clear error naming the template and the invalid field. `first`/`after` are handled by the shared input schema, merged into GraphQL variables by the handler (port POC's merge logic).

### D3 — Catalog: exactly the POC's 11 templates, restructured
- `orgCatalog.repos`, `orgCatalog.teams`, `orgCatalog.teamMembers`, `orgCatalog.members`, `orgCatalog.projects`, `orgCatalog.projectViews`, `orgCatalog.projectItems`, `activity.searchIssues`, `activity.searchPullRequests`, `graph.issueGraph`, `graph.pullRequestGraph`.
- Do NOT add commits/releases templates (evidence: no SDLC workflow consumes them — deferred deliberately).
- Restructure: **one file per template** under `graphql/templates/`, each exporting a typed template object (id, description, GraphQL document, variables zod schema, result path). `graphql/catalog.ts` assembles them behind `getTemplate(id)` — keep this lookup interface clean; it is the seam for a future framework-level extraction.

### D3-fix (G3, live bug) — `rateLimit` must actually work
The POC reads `responseBody.extensions.rateLimit`, but GitHub's GraphQL API does not populate `extensions` — rate-limit data must be requested as a field in the query. Therefore:
1. Add `rateLimit { cost remaining limit resetAt }` as a top-level selection to **all 11 query documents**.
2. Read it from `data.rateLimit`; **keep the `extensions.rateLimit` read as a fallback** (defensive — do not rely on my claim exclusively).
3. Strip `rateLimit` out of `data` before unwrapping (it is contract metadata, not payload; it must not appear in `meta` either).
4. A unit test must assert every catalog template's document contains a `rateLimit` selection.

### D4 — Retry: short in-connector; long waits are the workflow engine's job
Replace the POC's retry loop (5 attempts, sleeps up to 60s) with:
- **Max 2 retries, delay capped at ~5s**, with jitter; honor `retry-after` header only when it fits under the cap.
- On persistent rate-limiting (retries exhausted, or reset time beyond the cap): **fail fast with a typed error** that includes GitHub's reset time (from `retry-after` or `x-ratelimit-reset` headers, or the queried `rateLimit.resetAt`) and is identifiable (e.g. error `type`/`code` field) so workflow `retry.condition` expressions can match it.
- Keep the POC's header-parsing helpers (`retry-after`, `x-ratelimit-reset`) — they are good code, just re-purposed for the error payload.

### D5 — Error tiers (G4)
- **401/403 (non-rate-limit):** actionable message naming the likely missing scope(s): `repo`, `read:org`, `read:project`.
- **Rate-limited (403/429 with rate-limit signals, or GraphQL errors mentioning rate limits):** the typed retryable error from D4.
- **Partial response (`errors` array alongside partial `data`):** fail closed; error message includes each GraphQL error's message AND path.
- **Variable validation failures:** zod pre-flight, before any network call.

## Wiring in `github.ts`

- Both actions `isTool: false` (workflow-only — validated pattern from the POC).
- Add the `graphqlApiUrl` config field (URL-validated, default `https://api.github.com/graphql`, include in `validateUrls.fields`) — port from POC (GitHub Enterprise support).
- Port the POC's dual `test` handler (MCP listTools + GraphQL `viewer` query).
- Update the `skill` text: mention `runQueryTemplate`/`listQueryTemplates` as workflow ingest primitives not exposed to agents; remove any mention of `graphqlQuery`.
- i18n: new user-facing strings via `@kbn/i18n` per existing patterns in the file.

## Tests (all mocked HTTP — no live API calls)

In `graphql/` alongside sources, plus extend `github.test.ts`:
1. Per-template contract test: mock a realistic GraphQL response for each of the 11 templates → assert exact output shape (`data` array, `meta`, `pageInfo`, `rateLimit`, `shouldBackoff`, `templateId`).
2. Every template document contains `rateLimit` selection (static assertion over the catalog).
3. Every template document passes `validateReadOnlyGraphQLQuery` (static).
4. Unwrap edge cases: single-entity templates → one-element array; missing nodes → empty array + error or empty result (choose fail-closed and test it).
5. `shouldBackoff` true/false around the threshold; `extensions` fallback path.
6. Retry behavior: transient 429 → succeeds on retry within cap; persistent → typed error with reset time; `retry-after` beyond cap → immediate typed error.
7. Each error tier from D5.
8. Zod validation: per-template accept/reject cases; unknown `templateId` error lists available IDs.
9. `github.test.ts` action snapshot reflects exactly 2 GraphQL actions (no `graphqlQuery`).

## Verification commands

```bash
node scripts/jest src/platform/packages/shared/kbn-connector-specs
node scripts/type_check --project src/platform/packages/shared/kbn-connector-specs/tsconfig.json
node scripts/eslint --fix $(git diff --name-only)
node scripts/i18n_check --fix
```

All must pass. Follow repo conventions in `.claude/CLAUDE.md` (snake_case filenames, no `any`, `import type`, no eslint-disable / ts-ignore).

## Docs

Required-scopes documentation (DoD checkbox): document `repo`, `read:org`, `read:project` for the GraphQL actions, including the caveat that Projects v2 via GraphQL requires a classic PAT scope (`read:project`) and that fine-grained PATs have GraphQL limitations. Place per existing connector-docs conventions (check how other specs document config/auth; the `review-connector` skill in this package's `.claude/skills/` describes expectations).

## Out of scope — do NOT do

- No `graphqlQuery` / raw GraphQL execution in any form.
- No commits/releases templates.
- No framework-level (`lib/`) GraphQL machinery — everything stays under `specs/github/graphql/`.
- No dynamic template loading (saved objects / Fleet).
- No changes to SDLC workflow YAMLs (`sdlc_intel_fleet_package`) — that is Phase 2.
- No changes to the MCP actions or auth configuration beyond adding `graphqlApiUrl`.

## Definition of done for this session

- [ ] `graphql/` module on a clean branch off `main`, structured per D3, all decisions implemented
- [ ] All tests above passing via `node scripts/jest`
- [ ] Type check, eslint, i18n check green
- [ ] Scope docs written
- [ ] Short summary of any deviations from this brief (there should be none without a stated reason)
