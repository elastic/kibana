# Creating Context Engine pull requests

How the Context Engine team opens PRs in `elastic/kibana`. The team owns several workstreams — sources, KI-creation automations, the setup skill, the retrieval skill, agent traces, and the feedback loop (cases → patterns → improvements, a PoC in elastic/kibana#282241, not yet merged). Regardless of workstream, work is delivered as a series of small, independently-mergeable PRs — never one large drop.

## Sizing & splitting — the core rule

**Each PR is one semantic chunk that can merge into `main` on its own: type-checks, passes CI, ships its own tests, and stays inert until its feature flag / experimental gating is on.** A PoC or large branch must be split before review.

A PR boundary is good when you can complete the sentence *"after this merges, X is true"* with one coherent capability. Split along the natural seams of whatever you're building. Example seams (use the ones that apply — this is not a fixed pipeline):

- **Storage + services + model** — indices/saved objects + the service layer + shared types. (context-eng)
- **Server API / routes** — control-plane and read routes. (context-eng)
- **Background tasks** — Task Manager task types + runners, if any. (context-eng)
- **Browser API / hooks** — client data-fetching + React hooks. (context-eng)
- **UI components** — panels, flyouts, viewers (+ trace waterfall). (context-eng, +workchat-eng for the waterfall dep)
- **Cross-plugin / Agent Builder integration** — agent/tools/attachments/skills + allow-lists + chat bridge. (context-eng + workchat-eng)

Rules of thumb:
- Aim for a reviewable diff (**roughly ≤ ~1200 LoC**); split further if larger.
- Build **bottom-up**: storage → services → API → tasks → UI → integration. Lower layers don't depend on higher ones.
- **Quarantine cross-team surfaces** (`allow_lists.ts`, `agent_builder_platform`, `agent_builder` tracing, `@kbn/llm-trace-waterfall`) into their own PR so `@elastic/workchat-eng` reviews one focused change — even when we author it, CODEOWNERS routes review to them.
- Landing dead-but-tested code behind the feature flag is acceptable for an experimental plugin, as long as each PR carries its own unit tests.
- If a PR bounds coverage (skips a layer, defers tests), say so explicitly in the description — never let a split read as "complete".

## Branch & PR title

- Branch off `main`; keep branches focused on one chunk.
- Title: `[Context Engine] <what this PR delivers>` (sentence case). Cross-team infra PRs may use `[Agent Builder] <...>`.

## PR body template

```markdown
## Summary

What this PR delivers and why.
State that it is behind the relevant feature flag / experimental gating.

### What changed

Grouped by plugin/area. Call out the load-bearing pieces (e.g. the bridge inversion,
a service boundary, new storage indices, a task runner).

> **Ownership note for reviewers:** name any files owned by @elastic/workchat-eng
> (`allow_lists.ts`, `agent_builder_platform`, `agent_builder` tracing,
> `@kbn/llm-trace-waterfall`) so the right team reviews them.

### Checklist

- [ ] i18n: new strings use `i18n.translate` / `<FormattedMessage>` under `xpack.contextEngine.*`; `node scripts/i18n_check` run
- [ ] Unit/functional tests added or updated
- [ ] Checked for breaking HTTP API changes (new routes should be `access: experimental`)
- [ ] Release Notes section + `release_note:*` label (or `release_note:skip` while flagged)
- [ ] Backport labels reviewed (`backport:*`)

### Identify risks

- Data-loss paths (e.g. `deleteByQuery` reset), dependency-cycle regressions, v1
  signal-quality caveats. Note that the feature flag limits blast radius.
```

## Labels (elastic/kibana)

- Always: `Team:agent-builder`, `Team:Search`
- User-facing / in release notes: `feature:agent-builder`; otherwise `release_note:skip` while behind the flag
- Effort: `loe:small|medium|large|x-large`
- Version when committed to a release: `v9.x.0`
- Backports: `backport:*` per the backport guidelines

## Reviewers / CODEOWNERS

| Area | Owner |
|------|-------|
| `x-pack/platform/plugins/shared/context_engine/**` | `@elastic/context-eng` |
| `agent_builder_platform/**`, `agent_builder` tracing, `allow_lists.ts`, `@kbn/llm-trace-waterfall` | `@elastic/workchat-eng` |

CODEOWNERS routes review by path regardless of who authored the change — group cross-team files accordingly.

## Load-bearing architectural constraints (a PR must not break these)

- **Dependency direction:** `context_engine` must never import `agentBuilder` (server or browser). Integrate via the inversion: `context_engine` exports `registerContextEngineAgentBuilder(...)` (server) and `registerChatOpener(...)` (browser); `agent_builder_platform` calls them. Do **not** project-ref `@kbn/workflows-management-plugin` (re-introduces the cycle) — type the workflows API locally.
- **Feature flag:** every route wrapped so it 404s when off; the browser app registers `inaccessible` until the relevant setting flips.
- **No cross-bundle value imports** between plugins — duplicate small constants locally; `import type` only across bundles.

### If your PR adds Task Manager tasks

- **Task runners return `{ state: {...} }`**, never `{}`.
- **Never write system indices directly** (e.g. `.kibana_task_manager`) — use `runSoon`.

## Verification gates (run before pushing)

Build/verify with **Node 24** (`nvm use 24.18.0`):

```bash
# Types (per plugin project)
node scripts/type_check --project x-pack/platform/plugins/shared/context_engine/tsconfig.json
# also type-check agent_builder_platform when the PR touches it

# Lint (do NOT pass .jsonc to eslint)
node scripts/eslint <changed files>          # --fix applies prettier

# i18n (all strings under xpack.contextEngine.*)
node scripts/i18n_check

# Unit tests for the changed area
yarn jest <path>
```

- Use the **Flaky Test Runner** on any changed/added tests.
- Keep the PR **draft** until the gates pass and the description's checklist is filled.

## Checklist before opening

- [ ] One semantic chunk, reviewable size, mergeable on its own
- [ ] Behind the relevant feature flag; new routes `access: experimental`
- [ ] Architectural constraints intact (no `agentBuilder` import, no cross-bundle value imports)
- [ ] Cross-team files grouped and reviewers named
- [ ] type_check (Node 24) + eslint + i18n_check + unit tests green
- [ ] PR body follows the template; risks and any coverage gaps stated
- [ ] Correct labels applied
