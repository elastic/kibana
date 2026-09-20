# Plan: per-Worker agent picker, Hunt Watch only

Shape: `2026-09-20-hunt-worker-agent-picker-shape.md`
Branch: `hunt-worker-agent-picker` (based on `worker-settings-card-alignment` @ `3212aa456d2d`)
Gate host: **m1max** (never local — standing rule)

Each phase names how it is **proven**, not just what changes. Terminal disposition is
recorded at the bottom of each phase as the work lands.

---

## Phase 1 — contract: optional extras (common package)

**Change**
- `impl/worker_settings/types.ts`: `extras.defaultValue` becomes optional
  (`defaultValue?: TExtras`), documented as: absent ⇒ this Worker's `extras` may be
  absent entirely, present ⇒ strict required extras as today.
- `impl/worker_settings/contract.ts`:
  - `buildCompleteWorkerSettingsSchema` → `shape.extras = declaration.extras.defaultValue === undefined ? declaration.extras.schema.optional() : declaration.extras.schema`
  - `buildDefaultWorkerSettings` → spreads `extras` only when `defaultValue !== undefined`.

**Proven by** (`worker_settings.test.ts` in the common package, red before green):
- a declaration with extras-and-no-default parses a settings object **with no `extras` key**;
- the same declaration still **rejects** an invalid `extras` object when one is present;
- `buildDefaultWorkerSettings` for that declaration returns an object with **no `extras` key**;
- Rule Tuning (has `defaultValue`) still **rejects** a document missing `extras` — this is
  the regression guard proving the change did not loosen the existing path.

Disposition: **DONE as planned.** `types.ts` + `contract.ts` landed exactly as specified.
Covered by the `optional extras (no declared defaultValue)` block in the common package's
`worker_settings.test.ts`. Common package: 49/49 pass at `5bd464e674bc`.

---

## Phase 2 — Hunt Watch declares the field

**Change**
- New `HuntWorkerExtras` in the Hunt-owned schema: `agentId` **optional**, `z.string().min(1).max(64)`
  (max matches Agent Builder's `agentIdMaxLength`, same as alert analysis). Generated via the
  package's `openapi:generate` pipeline if the repo requires it for this schema family, otherwise
  hand-authored alongside the existing Hunt declaration — decided by inspecting how
  `RuleTuningWorkerExtras` is produced (`detection_watch_settings.schema.yaml` → `.gen.ts`),
  and following that same route so generated files stay generator-canonical.
- `impl/worker_settings/hunt_watch.ts`: `CONTINUOUS_THREAT_HUNT_SETTINGS` gains
  `extras: { schema: HuntWorkerExtras }` — **no `defaultValue`**.

**Proven by**
- hunt declaration accepts settings with no `extras`;
- accepts `extras: { agentId: 'my-agent' }`;
- rejects `extras: { agentId: '' }` (min 1) and `extras: { unknownKey: 1 }` (strict);
- `createDefaultWorkerSettings(HUNT_ID)` has **no `agentId`** — the "not enabled by default" proof.

Disposition: **DONE, generator route confirmed.** The open question in this phase resolved to
the generated path: `hunt_watch_settings.schema.yaml` → `node scripts/openapi/generate` →
`hunt_watch_settings.gen.ts` (12 → 13 schemas), so the generated file stays generator-canonical.
`agentId` emits as `.optional()` inside a `.strict()` object; `hunt_watch.ts` declares
`extras` with **no `defaultValue`**.
Deviation from plan: the type is named `ContinuousThreatHuntWorkerExtras` (not `HuntWorkerExtras`)
to match the worker id, and it needed an extra export line in the package root barrel
(`kbn-alertzero-common/index.ts`) — missed on first pass, caught by a RED UI test
(`readHuntExtras` undefined at runtime), not by typecheck.

---

## Phase 3 — server round-trip

**Change**: none expected. `parseWorkerValues` already forwards `extras` only when defined,
and `toTemplateValues` already omits it when undefined. This phase is verification, not edits —
if a change turns out to be required, it is recorded here rather than silently made.

**Proven by** (`server/managed_workflows/workers/worker_settings.test.ts`):
- `toSettings(createDefaultValues())` for Hunt yields settings with **no `extras`**;
- a **pre-existing stored Hunt document** (`{ settingsVersion: 1, autonomyLevel: 'manual' }`,
  no `extras` key) parses successfully — the backward-compat proof, and the test that
  would have caught the `state: 'unavailable'` regression;
- `applyPatch(defaults, { extras: { agentId: 'agent-x' } })` persists
  `extras.agentId === 'agent-x'` in template values;
- `applyPatch` with `{ extras: { agentId: '' } }` returns `invalid` naming the field.

Disposition: **DONE — verification only, no production edits needed.** The prediction held:
`parseWorkerValues`/`toTemplateValues` already handled absent `extras`, so this phase added
tests and changed no server source. Covered by the `Continuous Threat Hunt agent (opt-in extras)`
block in the server `worker_settings.test.ts` (68/68 pass in that file). The pre-existing
`still accepts an autonomy patch` test was preserved unchanged as the compat guard.

---

## Phase 4 — UI: hunt-only agent picker

**Change**
- `public/pages/watches/custom_settings/hunt/agent_id_field.tsx` — `EuiSuperSelect`,
  `data-test-subj="alertZeroHuntAgentSelector"`. Mirrors alert analysis:
  - `valueOfSelected = extras.agentId ?? agentBuilderDefaultAgentId`,
  - options re-inject the selected id when missing from the fetched list.
- `custom_settings/hunt/use_hunt_agents.ts` — `agentBuilder.agents.list()`, filters
  `readonly`, and gates `isLoading` on the same condition as `enabled` (the react-query v4
  disabled-query trap the alert-analysis hook documents).
- `custom_settings/hunt/hunt_settings.tsx` — the `WorkerCustomSettingsComponent`.
- `custom_settings/registry.ts` — add **only** the hunt worker id → `HuntSettings`.

**Proven by** (`hunt_settings.test.tsx` + a registry test):
- renders the picker for the hunt worker id;
- **a non-hunt worker id renders no agent picker** — the hunt-only proof, asserted through
  the registry, not by rendering the hunt component directly;
- with no stored `agentId`, the default agent is *displayed* and `onExtrasChange` is **not**
  called on mount (nothing is written without a user action);
- picking an agent calls `onExtrasChange({ agentId: <picked> })`;
- a stored `agentId` absent from the fetched list stays selected and visible.

Disposition: **DONE as planned**, with one filename deviation: the field component is
`hunt_agent_id_field.tsx` (not `agent_id_field.tsx`). Registry registers **only**
`SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID`. Hunt-only is asserted through the
registry (`registry.test.ts`, 4/4) rather than by rendering the component directly, as planned.
Unplanned work this phase forced: `watch_detail.test.tsx` rendered a tree the app never renders
(no `KibanaContextProvider`/`QueryClientProvider`), so three render sites now wrap in a
`TestProviders` helper mirroring `application.tsx`. That was a real integration defect in the
harness surfaced by the new component, not a workaround.

---

## Phase 5 — gates on m1max

- `node scripts/jest <changed test paths>` (per package — one config per run)
- `node scripts/type_check --project <each touched tsconfig>`
- `node scripts/eslint <changed files>`
- If a generated schema file is touched: re-run the generator and confirm the file is
  byte-identical (generator-canonical, per the prior PR's lesson).

Real counts pasted into the final report — no summarised "all green".

Disposition: **DONE — all four gates exit 0**, re-run at committed HEAD `5bd464e674bc` with a
clean tree (`DIRTY=[]`):
- `node scripts/jest --config .../kbn-alertzero-common/jest.config.js` → **49/49 pass**, rc=0
- `node scripts/jest --config .../alertzero/jest.config.js` → **427/427 pass, 36 suites**, rc=0
- `node scripts/eslint <17 changed .ts/.tsx>` → no errors, rc=0 (one prettier-only autofix pass)
- `node scripts/type_check --project .../alertzero/tsconfig.json` → tsc exited 0, rc=0
- generator re-run confirmed the `.gen.ts` is generator-canonical
- `node scripts/i18n_check` → passed (new translation keys are registered)
Note: `hermes verify` was deliberately **not** run — its generic Node recipe has damaged a
lockfile in a Kibana checkout before; repo-correct `scripts/*` gates were used instead.

---

## Phase 6 — mutation proof (anti-cheat)

Each of the two load-bearing behaviours is broken on purpose and the named test must go RED,
then restored and confirmed GREEN. Both outcomes reported.

1. **Hunt-only**: add a second (non-hunt) worker id to the registry map → the
   "non-hunt worker renders no agent picker" test must fail.
2. **Optional / not-defaulted**: give Hunt's declaration a
   `defaultValue: { agentId: agentBuilderDefaultAgentId }` → the
   "`createDefaultWorkerSettings` has no `agentId`" test must fail.

A test that cannot fail is not validation. If either stays green, the test is wrong and
gets fixed before proceeding.

Disposition: **DONE — both mutations proven RED, then restored GREEN.**
1. Hunt-only: adding Rule Creation to the registry map → `registry.test.ts` went **2 failed**,
   including `gives no Worker other than Continuous Threat Hunt the Hunt agent picker`.
   Restored → **4/4 pass**.
2. Optional/not-defaulted: giving Hunt `defaultValue: { agentId: 'default' }` → **5 tests RED**
   in the server suite, including `writes no extras on a fresh install` and
   `reads back a document stored with no extras, unchanged`. Restored → **68/68 pass**.
No test is skipped/xit/.only; no assertion or timeout was relaxed.

---

## Phase 7 — e2e on a real stack

Boot Kibana + ES from this branch on m1max with `--no-base-path` (standing rule), then:
- `GET /internal/alertzero/workers` → hunt worker present, `settings` has **no `extras.agentId`**;
- `PUT`/update the hunt worker's settings with `extras: { agentId: <real agent id> }` + its
  `settingsRevision` → 200, and a follow-up `GET` shows the id **persisted**;
- the same `GET` shows a non-hunt worker (e.g. Rule Tuning) with **no `agentId`** anywhere;
- UI screenshot of the hunt Watch settings showing the picker, and of another Watch showing
  no picker.

All evidence must post-date the last code edit (standing rule).

Disposition: **DONE — validated on a live stack, all evidence post-dating the last edit.**
Dedicated stack from this branch: ES :9230 (green) + Kibana :5631 booted with `--no-base-path`.
Two config discoveries, now recorded in the `kibana-dev-environment` skill: AlertZero is
disabled by default (`xpack.alertzero.enabled: false`) **and** silently disabled unless
`xpack.agenticInvestigations.enabled` + `xpack.evals.enabled` are also true; internal routes
need `x-elastic-internal-origin: Kibana` or they 400.
- `GET /internal/alertzero/workers` → Hunt settings `{workerId, autonomy}` — **no `extras`**,
  while Rule Tuning shows `extras: {analysisWindowDays: 14}`. The optional-by-default proof.
- First write is `PATCH` (not `PUT`) with `settingsRevision: null` → 200; re-read shows
  `extras.agentId` persisted at `settingsRevision: 1`.
- `PATCH extras.agentId` against **three** non-Hunt Workers (Alert Triage, Rule Creation,
  Rule Tuning) → **400 Invalid settings** each. Server-side scope enforcement.
- `extras: {}` accepted on Hunt — `agentId` is genuinely optional, not merely defaulted.
- Browser (real Chrome, superuser, Security solution view): picker present on **Hunt Watch**;
  **absent** on Detection, Triage/Floor and Forensics Watches (Detection shows its own
  rule-tuning field, proving the negative is scoped, not a blanket render failure).
- Full UI round-trip: Save starts disabled → picking `Nightshift Investigator` (a real Agent
  Builder agent) enables it → save → server shows
  `extras.agentId: significant-events.investigation` → survives page reload. No error toasts.
Deviation: screenshots were **not** captured — the headless window reports 0×0 and
`Page.captureScreenshot` times out. DOM/API evidence was used instead of a fabricated image;
the workaround is recorded in the `qa-browser-verification` skill.

---

## Phase 8 — deslop + review prep

`deslop` the diff, then `pre-pr-self-review`. Do **not** undraft or push to a PR without
Patryk's go-ahead.

Disposition: **deslop DONE; push/undraft correctly NOT done (awaiting go-ahead).**
Deslop compared comment density against the neighbouring `rule_tuning` module: its test file
carries zero comments, so two explainer blocks were cut from `hunt_settings.test.tsx` and a
5-line block in `watch_detail.test.tsx` was tightened to the 2-3 line norm the surrounding
files already use. Source-file JSDoc was kept — it matches the neighbour's existing style.
Full suites re-run after the trim: 427/427 + 49/49 still green.
Committed as `5bd464e674bc` on branch `hunt-worker-agent-picker` (author
`patryk.kopycinski@elastic.co`). The commit currently exists **only on m1max** — local HEAD is
still the base `3212aa456d2d`, so any push must originate from m1max.

---

## Explicitly not done

- Wiring the picked agent into an `ai.agent` step: the hunt workflow is a `console` stub with
  no agent step. The value is stored and forwarded; nothing runs it yet. Said plainly rather
  than implied by a green test.
