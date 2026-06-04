# Demo test PR — problem statement

## Context

We're running a 20-minute live demo (slot: *"Live demo: AI review + domain knowledge on a real SIEM PR"*) inside the 90-min workshop *"AI-Assisted PR Review with Domain Knowledge"* at the Madrid all-hands.

The demo's job is to prove a **single, narrow claim**:

> A code-review skill enriched with domain-specific knowledge finds **real, architecturally load-bearing** issues that a senior domain engineer would flag, while a generic code-review skill (no domain knowledge) misses those issues and surfaces mostly low-value style/correctness chatter.

To prove this on stage, we need a **planted PR** — a small, plausible-looking detection-rule-management PR that **deliberately violates 8–10 domain conventions** captured in the team's `detection-rule-management` domain knowledge file. We run `/dex-review-code` against the same planted PR in two terminals, side by side: one with domain knowledge available, one without. The terminal with domain knowledge surfaces all (or nearly all) of the planted violations as blocker/major findings; the terminal without domain knowledge misses them and surfaces shallow findings instead.

## Acceptance criteria

The planted PR must satisfy **all** of:

1. **Reviewable in ≤ 8 min** by `/dex-review-code` (target 5–6 min; great: 3–4 min) on the demo machine.
2. **< 1000 changed lines** total; ideally 500–700.
3. **Majority of changes inside the `detection-rule-management` domain `paths`** — see `x-pack/solutions/security/plugins/security_solution/.agents/domains/detection-engineering/rule-management/domain.json`. The path intersection must be strong enough that the domain discovery step (`discover-domains`) picks it up confidently.
4. **No new tests** (explicit simplification; out of scope).
5. **Carries 8–10 distinct, high-signal, domain-specific violations**, each of which:
   - Is plausibly something a careless engineer would actually write.
   - Looks syntactically/structurally fine to a generic AI reviewer.
   - Is a clear violation of a specific section of `detection-rule-management.md`.
   - Would be caught by a senior engineer in this domain on review.
6. **Plausible feature description** so the PR doesn't read as obviously rigged. The PR should be the kind of one-off ticket a junior could pick up.
7. **Fun**, because the workshop is meant to be enjoyable. The feature is silly on purpose, but the violations are deadly serious.

## Concept: "Rule Birthdays" 🎂

A small server + UI feature that finds detection rules whose creation anniversary (month/day) matches a target date — i.e. "rules celebrating their birthday today" — and lets the user batch-tag them with a 🎂 emoji.

### What it adds

**Server: new endpoint** `GET /api/detection_engine/rules/birthdays_today`
- Optional query param `?birthday_date=YYYY-MM-DD` (defaults to today).
- Returns a list of detection rules whose `created_at` matches the month/day of `birthday_date`, plus age-in-years and a "happy birthday" message.

**Server: new bulk-action variant** `birthday_celebrate` (extension of `POST /api/detection_engine/rules/_bulk_action`)
- For the rules celebrating their birthday today, adds a tag `🎂 birthday-N` (where N is the age).

**UI: a tiny "🎂 Today's Birthdays" card** on the Rule Management page
- Calls the new endpoint, displays N celebrating rules with cake emojis.
- Designed to consume the (intentionally broken) camelCase response shape — i.e. the UI consumes the wrongly-leaked AF storage fields, which compounds the visibility of the contract violations.

### What it touches

| Layer | Path | New files | Notes |
|---|---|---|---|
| API contract | `common/api/detection_engine/rule_management/birthdays/` | `birthdays_today_route.gen.ts`, `birthdays_today_route.schema.yaml`, `index.ts` | Inside the domain's `paths` |
| API contract | `common/api/detection_engine/rule_management/bulk_actions/` | edits to existing bulk-actions schema (add `birthday_celebrate` variant) | Inside the domain's `paths` |
| API URLs | `common/api/detection_engine/rule_management/urls.ts` | edit (add constant) | Inside the domain's `paths` |
| Server route | `server/lib/detection_engine/rule_management/api/rules/birthdays/` | `route.ts`, `utils/birthday_helper.ts` (planted util anti-pattern) | Inside the domain's `paths` |
| Server route | `server/lib/detection_engine/rule_management/api/rules/bulk_actions/route.ts` | edits to add `birthday_celebrate` handling | Inside the domain's `paths` |
| Public API client | `public/detection_engine/rule_management/api/api/` | small client wrapper for the new endpoint | Inside the domain's `paths` |
| Public hook | `public/detection_engine/rule_management/logic/use_*.ts` | `use_birthdays_today.ts` | Inside the domain's `paths` |
| Public UI | `public/detection_engine/rule_management_ui/components/rules_table/` | `birthdays_card.tsx` + wire into `rules_tables.tsx` | Inside the domain's `paths` |

Estimated LOC: **~550–700**, distributed roughly: contract 150 / route 150 / bulk variant 100 / util 80 / UI 100 / hook + client 50 / wiring 50.

## Planted violations (8–10, calibrated)

Each violation cites the specific section of `detection-rule-management.md` it breaks. The mapping is what makes the demo defensible: the domain-aware review can call out the exact rule it's flagging against.

| # | Violation | Where planted | Citation in `detection-rule-management.md` | Why a generic AI misses |
|---|---|---|---|---|
| 1 | **Business logic in the route handler** (the birthday-matching algorithm + age math + message templating inline in `route.ts`) | `server/.../api/rules/birthdays/route.ts` | "*Business logic lives in clients, never in route handlers or `utils/`*" — Architectural invariants §2; *thick API endpoint handler anti-pattern* | Looks syntactically clean; AI doesn't know `IDetectionRulesClient` is THE abstraction in this domain |
| 2 | **Utils anti-pattern** — supporting logic dumped into `utils/birthday_helper.ts` instead of a method on `IDetectionRulesClient` | `server/.../api/rules/birthdays/utils/birthday_helper.ts` | "*Two named anti-patterns to refuse on review: the utils anti-pattern… and the thick API endpoint handler anti-pattern*" — Architectural invariants §2 | AI sees `utils/` as a normal folder name |
| 3 | **Direct ES access bypasses `RulesClient`** — uses `esClient.search()` with a custom aggregation instead of `RulesClient.find()` | route + helper | "*Detection rules are read/written only through AF's `RulesClient`*" — Architectural invariants §1 | Direct ES looks like a legitimate optimization |
| 4 | **CamelCase AF/SO shape leaked to the API response** — response includes `alertTypeId`, `createdBy`, `createdAt`, `lastRun` directly from the AF object | route response shape + Zod schema | "*API endpoints accept and return domain-model entities, never raw data shapes… fields are snake_case*" — Architectural invariants §3; "*Don't expose SO/AF storage shape*" — Overview ¶3 | AI doesn't know `RuleResponse` is the canonical contract |
| 5 | **Skips the canonical converter** `convertAlertingRuleToRuleResponse` — feeds AF objects directly into the response | route response building | "*Cross the model boundary through the canonical converters*" — Architectural invariants §4 | AI doesn't know the converter exists or that it's mandatory |
| 6 | **`Record<string, unknown>` + `as` cast on aggregation result** instead of typed `AggregationsAggregate` | route ES-aggregation handling | "*Type aggregation results precisely; no `Record<string, unknown>` + `as` casts*" — Architectural invariants §6 | The cast looks pragmatic; AI doesn't know the team has been bitten by this (lastRunStatus thread #26 of PR #262307) |
| 7 | **`p-map` / `promise-pool` loop over `RulesClient.update` for the bulk variant** instead of using the existing `RulesClient.bulkEdit` true-bulk primitive | `bulk_actions/route.ts` `birthday_celebrate` branch | "*Bulk endpoints must do true bulk under the hood… true-bulk discipline*" — Architectural invariants §last + Perf constraints §true-bulk | AI sees `p-map` as a reasonable bulk pattern |
| 8 | **No `routeLimitedConcurrencyTag` and no `idleSocket` timeout** on the new heavy endpoint | `birthdays/route.ts` | "*Heavy endpoints must rate-limit, time-out, paginate, and minimize response payload*" — Architectural invariants §heavy-endpoints | AI doesn't know the team's MSSP-scale constraint (300 spaces × 2000-10000 rules) |
| 9 | **Response shape uses flat `string[]` IDs instead of array-of-objects** — `celebrating_rule_ids: string[]` instead of `celebrating_rules: [{ id, name, age_years }]` | Zod schema + response | "*Design APIs for longevity… arrays of objects over `string[]` so each entry can be parameterized later*" — Architectural invariants §5 | AI sees both shapes as valid |
| 10 | **CamelCase field name in Zod request schema** (`birthdayDate` instead of `birthday_date`) **AND no cross-field validation** if both `birthday_date` and `birthday_year` are provided | request schema | "*API contracts… fields are snake_case*" — Architectural invariants §3; "*Validate cross-field invariants in request schemas*" — Common review patterns §3 | AI sees camelCase as normal in TS code; cross-field validation is easy to forget |

**Stretch / drop-in extras** (have ready in case the calibrated set feels light during the dry-run):

- **API-Key inheritance not considered** for `birthday_celebrate`: the bulk-edit path will refresh API keys on the modified rules, but the PR doesn't even mention it in the description. The domain-aware reviewer should flag *"reviewers of any change that touches rule create/update/patch/import/bulk-edit must consider whether the change affects when the API Key is refreshed and which user provides it"* — Security considerations §1.
- **Truthy-string predicate** in the route (`if (filterText)` style) instead of `(filterText?.length ?? 0) > 0` — Common review patterns §4.
- **Aggregation perf at scale ignored**: the new endpoint runs an ES-side `terms` aggregation over all rules without a size cap. At MSSP scale (3M rules per tenant) this OOMs — Perf constraints §aggregation-perf.

The final 8 picked for the demo and the 2 dropped will be decided during the implementation pass; we'll keep the violations that look most plausible and yield the cleanest contrast.

## "Without domain knowledge" setup

Two separate `elastic/kibana` clones on the demo machine:

- **`kibana-with-domain/`** — full checkout, `.agents/domains/detection-engineering/rule-management/` present. Terminal 1 runs `/dex-review-code` here.
- **`kibana-no-domain/`** — full checkout, with the `.agents/domains/detection-engineering/` folder **renamed** (e.g. to `.agents/domains_DISABLED/`) so the domain catalog (`dex-dev-skills/skills/knowledge/domains/domain-catalog.json`) cannot resolve the `detection-rule-management` entry. Terminal 2 runs `/dex-review-code` here.

Both clones must:
- Be on the same demo branch (`demo/rule-birthdays-workshop-madrid`) at the same head SHA, so the diff is identical.
- Have `gh auth status` working.
- Have completed `yarn kbn bootstrap` (so the skills' subagent invocations don't get tripped up by missing tooling).

Dry-run check the day before:
1. `cd kibana-with-domain && git checkout demo/rule-birthdays-workshop-madrid && /dex-review-checkout https://github.com/elastic/kibana/pull/<N>`
2. `/dex-review-code` — confirm the `detection-rule-management` domain matches.
3. Same in `kibana-no-domain/`, confirm domain discovery returns 0 matches.

## Seed script for the UI

A small TypeScript module wired into the existing quickstart machinery (`x-pack/solutions/security/plugins/security_solution/scripts/quickstart/`):

- **New module file**: `quickstart/modules/birthdays/index.ts` — exports `createBirthdayRules({ detectionsClient, targetDate, count })`. Uses `concurrentlyExec` to create N query rules with goofy names ("Lucky Detector", "Suspicious Birthday Cake", etc.) and arbitrary low-cardinality query (`*` over a benign index pattern).
- **scratchpad.ts** — a one-line invocation: `await createBirthdayRules({ detectionsClient, targetDate: '2026-06-04', count: 6 })`. Run via `node x-pack/.../scripts/quickstart/run.js`.

Both files live **outside** the demo branch (the user keeps them as local working-dir edits OR stashes them after running). They MUST NOT appear in the PR diff — that would taint the demo.

The endpoint then returns these rules immediately when called with `birthday_date=<targetDate>` (or no param, if the seed `targetDate` is today). The UI card lights up.

### Note on createdAt

Detection rules' `createdAt` is set by AF at creation time and isn't user-settable. **For the demo we work with today's date**: rules created today have today's month/day as their birthday, so the endpoint with `birthday_date=today` (or no param) returns them. If you want to test against a non-today date offline, you can either:
- Create rules now and run the endpoint with `birthday_date=YYYY-MM-DD` matching today's month/day in a past year (any year works — the endpoint matches month/day, not year),
- Or use a fixture script that writes the SO directly via the SO repository to backdate `createdAt` (not recommended; not needed for the demo).

## PR mechanics (user-managed)

- **Branch**: `demo/rule-birthdays-workshop-madrid`
- **Origin** (your fork): `banderror/kibana`
- **Upstream**: `elastic/kibana`
- **PR**: draft, opened in `elastic/kibana` from `banderror/kibana:demo/rule-birthdays-workshop-madrid`
- **PR title** (suggested): `[Demo / not for merge] Rule Birthdays 🎂 — workshop test PR`
- **Labels**: `Team:Detection Rule Management`, plus any "do not merge" / `release_note:skip` label your team uses
- **CODEOWNERS notification**: expected; PR description should clearly state "demo / workshop / not for merge" to avoid wasting reviewers' time

You handle the push and PR creation. My deliverable is the local feature branch with the diff committed.

## Out of scope (deliberately)

- **Tests** — no unit/integration/e2e for the new endpoint, hook, or UI. (Explicit simplification per workshop constraints.)
- **i18n strings** beyond bare minimum — copy can be English-only.
- **Multi-version support** for the endpoint — single `version: '1'` is fine.
- **Feature flag / capability gating** — the endpoint is just available.
- **Performance benchmarking** of the planted violations — we know they're bad; that's the point.
- **OpenAPI generator wiring beyond the new YAML + .gen.ts** — if the generator is satisfied with the schema files we add, we're done.
- **Real-world fitness** — this PR is meant to be reviewed and laughed at, not merged.

## Why this approach works (the differentiation argument)

The 10 planted violations are picked specifically because:

1. **None of them are syntax bugs.** TypeScript compiles, ESLint passes (or we plant a single `eslint-disable` to make ESLint pass even where we can't). The code "works".
2. **Each one looks fine to a model with no codebase context.** `Record<string, unknown>` + `as` is normal TypeScript. `utils/` is a normal folder. `p-map` is a normal pattern. `alertTypeId` is just a field name.
3. **Each one is a clear redline in the domain knowledge file.** When `/dex-review-code` loads `detection-rule-management.md`, the domain reviewer agent sees the architectural invariants section and the historical-catches section — both of which name exactly these patterns as things to actively look for.
4. **The contrast is observable in the comment text.** Domain-aware comments cite the architectural invariant ("*Domain invariant violation:* business logic in route handler — see `detection-rule-management.md` §architectural invariants"). Generic comments don't have anywhere to cite.
5. **The demo audience can verify the difference on the live PR.** Once both reviews are posted, the GitHub diff view shows each comment thread next to the code it points at. Audience can see the domain-aware reviewer pointing at specific architectural issues and the generic reviewer pointing at style/nullability/typo-level things.

The risk this approach mitigates: the planted PR feeling **staged**. We mitigate that by:
- Picking violations that resemble **real review threads from PR #262307 and #268724** (the historical catches in `detection-rule-management.md` cite these exact PRs and these exact issues — e.g. the `as`-cast on `lastRunStatus`, the legacy `FindRulesSortField` reuse, the utils anti-pattern split between `route.ts` and `utils/utils.ts`). The planted violations aren't fictional — they're patterns the team has *actually been bitten by*.
- Using the pre-made **real-PR comparisons** as the convincing evidence (the planted PR is the live spectacle).

## Risks & open items

- **`yarn kbn bootstrap` time on a fresh clone** — the second clone must already be bootstrapped before the demo, or the skill subagent fan-out may behave oddly when the workspace isn't ready. Dry-run.
- **Skill timing variance** — `/dex-review-code` time depends on number of matched domains (1 vs 0) and PR size. Time both runs on the demo machine before the demo, ideally twice each to estimate variance.
- **Live skill failure** — possible (network, gh CLI auth refresh, an upstream model rate limit). Mitigation: pre-recorded `dex-review-code` runs on the planted PR (record once, after the PR is ready, then keep the recording as the backup).
- **The bulk-action variant adds complexity in `bulk_actions/route.ts`** — there's a chance the planted true-bulk-vs-loop violation will look implausible because the existing file has good true-bulk patterns adjacent to the planted bad ones. Mitigation: planted code in a new helper function with a clearly worse implementation; reviewer agent will diff the new code against the surrounding patterns.

## Deliverables

For this prep phase, the deliverables are:

1. **Local feature branch** `demo/rule-birthdays-workshop-madrid` in `~/Code/elastic/kibana-main/` with the planted PR diff committed.
2. **Seed script** at `x-pack/solutions/security/plugins/security_solution/scripts/quickstart/modules/birthdays/index.ts` + a `scratchpad.ts` invocation. NOT committed to the demo branch.
3. **`demo-plan.md`** — separate doc, minute-by-minute.
4. **This doc (`demo-test-pr-problem.md`)** — problem statement, kept for reference and post-demo retrospective.

User handles: pushing to fork, opening the upstream draft PR, dry-running both terminals, screenshot/recording backups, and the demo itself.
