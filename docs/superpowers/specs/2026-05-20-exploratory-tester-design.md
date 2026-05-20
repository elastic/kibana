# Exploratory Tester Skill — Design Spec

**Date:** 2026-05-20
**Author:** Gloria Hornero
**Status:** Draft

---

## Goal

A skill that lets a Claude Code or Cursor agent perform exploratory testing on Kibana Security Solution. The agent drives a real browser via playwright-mcp, collects structured evidence, and reports findings with full reproducibility context — without introducing any new framework, swarm infrastructure, or external memory layer.

No new orchestration needed: the host (Claude Code / Cursor) is already an orchestrator, playwright-mcp provides the browser, and the Scout server provides the running Kibana instance.

---

## File Layout

```
x-pack/solutions/security/plugins/security_solution/.agents/skills/
└── exploratory-tester/
    ├── SKILL.md
    └── knowledge/
        ├── siem-migrations.md      ← one file per feature area, committed and shared
        ├── detection-engine.md
        └── ...                     ← created on first session for a new area
```

Session artifacts — gitignored, never committed:
```
.exploratory-session/
├── config.json                     ← parsed scope, flows, prerequisites, known bugs
├── findings-flow-1.md              ← one file per flow (sub-agent writes here)
├── findings-flow-2.md
├── screenshots/
│   └── finding-001.png
└── report.md                       ← final merged report
```

Add `.exploratory-session/` to the repo root `.gitignore`.

---

## Two Modes

The skill operates in two modes selected by the user at invocation:

| Mode | Invocation | When to use |
|---|---|---|
| `single` (default) | no mode specified | POC, small scopes, sequential exploration |
| `parallel` | `in parallel mode` in the command | Larger scopes, faster coverage |

Single mode runs all flows sequentially. Parallel mode dispatches one sub-agent per flow. The flow exploration logic is identical in both — `parallel` is a promotion, not a redesign.

---

## Input Modes

### Mode 1 — Inline

User provides scope directly in the invocation command:

```
Read and follow exploratory-tester/SKILL.md
Area: SIEM Migrations dashboards
Flows:
  - rename with special characters
  - cancel mid-progress
  - upload invalid file type
    entry: SIEM Migrations > Dashboards > Upload button
    expected: validation error shown, no crash
Setup: Bedrock connector, role: t1_analyst
```

Each flow can optionally include `entry` (navigation path) and `expected` (correct outcome). When omitted, the agent uses browser discovery and heuristics.

### Mode 2 — GitHub Issue or PR Comment

User points the skill at an issue or PR number:

```
Read and follow exploratory-tester/SKILL.md for issue #12345
Read and follow exploratory-tester/SKILL.md in parallel mode for PR #12345
```

The agent fetches the issue/PR and finds the latest comment containing `## Exploratory testing scope`. If no such comment is found, the skill stops and shows the user the exact format to add.

**Expected comment format:**
```markdown
## Exploratory testing scope

### Area
SIEM Migrations dashboards

### Flows
- rename with special characters
- cancel mid-progress
- upload invalid file type
  entry: SIEM Migrations > Dashboards > Upload button
  expected: validation error shown, no crash

### Setup
- Bedrock connector configured
- Role: t1_analyst
```

Both modes produce the same `config.json` internally before Phase 1 begins.

### Environment section (both input modes)

The scope input accepts an optional `Environment` section. When omitted, `stateful-classic` is assumed.

**Agent-managed — agent starts Scout:**
```
Environment:
  type: stateful-classic     ← default
  # or: stateful-ess
  # or: serverless
  project-type: security     ← required when type is serverless (security | observability | search)
```

**User-provided — environment already running:**
```
Environment:
  url: https://my-cluster.cloud.elastic.co   ← or $KIBANA_TEST_URL
  username: admin                             ← or $KIBANA_TEST_USERNAME
  password: mypassword                        ← or $KIBANA_TEST_PASSWORD
  data-setup: skip                            ← or: agent (default)
```

Env var references (`$VAR`) are resolved at runtime — credentials are never stored in plain text in committed files. They land only in `.exploratory-session/config.json`, which is gitignored.

In automated mode (`mode: auto` in scope), interactive confirmation prompts are suppressed and the final report is posted as a GitHub comment rather than presented for user review.

---

## Environment Capabilities

Setup behaviour differs by environment type. The agent checks capability before each setup step and warns + skips unsupported steps — never fails hard. Skipped steps are recorded in `config.json` under `skipped_setup`.

| Setup step | Stateful classic | Stateful ESS | Serverless |
|---|---|---|---|
| esArchiver fixtures | ✓ | ✓ | ⚠️ limited — some index patterns differ |
| Role-based users | ✓ standard roles | ✓ standard roles | ✗ — map to project roles (see below) |
| AI connectors | ✓ | ✓ | ✓ different API endpoint |
| Feature flags / uiSettings | ✓ | ✓ | ⚠️ some unavailable |

**Role mapping for serverless:**

| Scope role | Serverless project role |
|---|---|
| `t1_analyst` | `viewer` |
| `t2_analyst` | `editor` |
| `admin` | `admin` |
| Any unrecognised role | Warn, use `viewer`, record in `skipped_setup` |

**Scout start commands by type:**

| Type | Command |
|---|---|
| `stateful-classic` | `node scripts/scout.js start-server --arch stateful --domain classic &` |
| `stateful-ess` | `node scripts/scout.js start-server --arch stateful --domain ess &` |
| `serverless` | `node scripts/scout.js start-server --arch serverless --projectType <project-type> &` |

---

## Phases

| Phase | Purpose | Exit condition |
|---|---|---|
| 0 — Setup | Parse input, start Scout (agent-managed) or skip (user-provided), fetch known bugs, write `config.json` | `config.json` written, server booting or already available |
| 1 — Wait & login | Wait for Kibana ready, log in, set up data, confirm scope with user | Authenticated, user confirms proceed |
| 2 — Explore | Walk every flow in scope using the checklist + timebox | Every flow has at least one entry in its `findings-flow-N.md` |
| 3 — Report | Merge findings, classify, filter known noise, present to user, update knowledge | User has reviewed the report |

### Phase 0 — Setup

**Agent-managed:** start Scout immediately in the background using the command for the requested environment type. Server boots while the rest of Phase 0 runs.

**User-provided:** skip Scout startup. Verify connectivity:
```bash
curl -s -u <username>:<password> <url>/api/status
```
If unreachable — stop and tell the user to check the environment.

Parse the input (inline or GitHub). For GitHub mode:
```bash
gh issue view <NUMBER> --repo elastic/kibana --json number,title,body,comments
# or
gh pr view <NUMBER> --repo elastic/kibana --json number,title,body,comments
```

Find the latest `## Exploratory testing scope` comment and parse it. If not found — stop and show the user the exact format to add.

Search GitHub for known bugs in the area:
```bash
gh issue list --repo elastic/kibana --state open \
  --search "<area keywords>" --json number,title,labels --limit 10
gh issue list --repo elastic/kibana --state closed \
  --search "<area keywords>" --json number,title,closedAt --limit 5
```

Write `config.json`:
```json
{
  "area": "SIEM Migrations dashboards",
  "environment": {
    "type": "stateful-classic",
    "url": "http://localhost:5620",
    "managed": true
  },
  "flows": [
    { "name": "rename with special characters", "entry": null, "expected": null },
    { "name": "cancel mid-progress", "entry": null, "expected": null }
  ],
  "setup": { "connectors": ["bedrock"], "role": "t1_analyst", "resolved_role": "t1_analyst" },
  "skipped_setup": [],
  "known_open_bugs": [{ "number": 1234, "title": "Rename fails with apostrophes" }],
  "recently_closed_bugs": [{ "number": 1200, "title": "Upload spinner never resolves" }]
}
```

Read `knowledge/<area>.md` for accumulated false positives and navigation patterns.

### Phase 1 — Wait & Login

**Agent-managed:** wait for Scout to become available:
```bash
until curl -s -u elastic:changeme http://localhost:5620/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); \
    exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)" \
  2>/dev/null; do echo "Waiting for Kibana..."; sleep 10; done
```

**User-provided:** skip the wait loop — environment is already available.

Log in via browser using the environment URL and credentials. For agent-managed environments: `<url>/login?auth_provider_hint=cloud-basic`.

Set up test data according to `config.json` setup section, respecting environment capability limits. Record any skipped steps in `config.json` under `skipped_setup`.

Confirm with user: "Kibana ready (`<env-type>` at `<url>`). Exploring `<area>` with role `<resolved-role>`. Skipped setup: `<list or none>`. Flows: `<list>`. Proceed?"

### Phase 2 — Explore

#### Single mode

For each flow in sequence, run the explore loop (see below).

#### Parallel mode

The orchestrator dispatches one sub-agent per flow via the Agent tool, passing:
- `flow` — the flow object from `config.json`
- `config_path` — path to `.exploratory-session/config.json`
- `findings_path` — path to `.exploratory-session/findings-flow-N.md`

Sub-agents are stateless: read config, explore assigned flow, write findings, exit. They read `knowledge/<area>.md` but never write to it.

Wait for all sub-agents to complete before proceeding to Phase 3.

#### The Explore Loop (per flow)

**Termination: checklist complete OR 4-minute timebox — whichever fires first.** The timebox default is 4 minutes and can be overridden per flow in the scope input with `timeout: N minutes`.

Mandatory checklist, attempted in order:

| Step | What to attempt |
|---|---|
| 1 | Happy path — execute the flow as intended |
| 2 | Missing prerequisites — remove one required setup item and retry |
| 3 | Invalid/edge-case input — empty strings, special characters, max length, wrong type |
| 4 | Cancel / back-navigate mid-flow |
| 5 | Refresh during an in-flight operation |

At every step: collect `browser_console_messages`, `browser_network_requests`, take a screenshot. Append an entry to `findings-flow-N.md` immediately — even if no issue is found (record what was attempted and what happened).

If checklist completes before the timebox: continue with bounded free exploration — probe one or two unexpected UI states noticed during the checklist, or follow a single hint from findings so far. Do not start new flows or navigate to unrelated areas.

If timebox fires before checklist completes: log remaining items as `skipped: time budget exhausted`.

**How the agent knows how to execute a flow:**
1. `entry` and `expected` from `config.json` if provided
2. Browser discovery — take a snapshot, read the visible UI, navigate from what's on screen
3. Test file as optional context if referenced in scope
4. `knowledge/<area>.md` for accumulated navigation patterns
5. Heuristics for expected behavior when nothing else is available

### Phase 3 — Report

Merge all `findings-flow-N.md` files into `report.md`.

Classify each finding:

| Level | Criteria | Agent action |
|---|---|---|
| 1 — Confirmed bug | JS exception, HTTP 5xx, divergence from stated expected behavior | Agent decides: report as bug |
| 2 — Suspicious | Unexpected 4xx, missing element, broken layout, no feedback on action | Agent flags: user decides |
| 3 — Observation | `console.warn`, transient delay, unclassifiable | Listed, not flagged |

Filter Level 2 and 3 findings against `knowledge/<area>.md` (accumulated false positives) and `known_open_bugs` from `config.json` (already tracked). Suppressed findings are listed in a separate "Known / Suppressed" section — never silently dropped.

Present the report. After user review, append confirmed patterns to `knowledge/<area>.md`.

---

## Finding Format

Each entry in `findings-flow-N.md`:

```markdown
## Finding: [short title]

**Level:** 2
**Flow:** rename with special characters
**Role:** t1_analyst
**Checklist step:** 3 — invalid/edge-case input

### Steps followed
1. Navigate to SIEM Migrations > Dashboards
2. Click rename on migration "Test Migration"
3. Enter name with apostrophe: "Test's Migration"
4. Click Save

### Current behavior
Form submission failed with a 400 Bad Request.
Console: `ValidationError: name contains invalid characters`

### Expected behavior
Name should save — apostrophes are valid in names.

### Why this might be an issue
The validation rejects apostrophes without explaining which characters are valid.
This would block legitimate names (possessives, Irish names, etc.).
The error message gives no guidance on how to correct the input.

### Evidence
- Screenshot: `.exploratory-session/screenshots/finding-001.png`
- Console: `ValidationError: name contains invalid characters (migration_utils.ts:42)`
- Network: POST `/api/siem_migrations/rules/rename` → 400 `{"error":"invalid_name"}`
```

**Rules:**
- Role is always recorded — a finding without a role is not reproducible
- Steps followed are numbered and literal — exact sequence, not a summary
- "Why this might be an issue" is mandatory for Level 1 and 2 — the agent must commit to reasoning
- Evidence is scoped — only the console line and network request relevant to this finding, not a full dump
- Level 1 findings additionally state which expected behavior they violate
- Level 3 findings use a shorter format: current behavior + evidence only

---

## Knowledge Files

`knowledge/<area>.md` accumulates two things across sessions:

1. **Known false positives** — expected behaviors that look like bugs but are not
2. **Navigation patterns** — how to reach features in this area (built up over sessions)

The area name is derived deterministically from the scope: lowercase the `Area` field from the input, replace spaces with hyphens (e.g. "SIEM Migrations dashboards" → `siem-migrations-dashboards`). If no knowledge file exists for the area, the agent creates it at the end of the first session.

Knowledge files are **committed and shared** — team knowledge compounds across developers and sessions. A per-developer gitignored file would rediscover the same false positives on every run.

Knowledge files are **read-only during exploration** — only updated after the user reviews the report in Phase 3. No write conflicts in parallel mode.

---

## Failure Handling

| Failure | When | Response |
|---|---|---|
| Scout server doesn't become available within 10 min | Phase 0 | Stop. Tell user to check Scout output. |
| Scout already running on port 5620 | Phase 0 | Reuse it. Tell user an existing session is being reused. |
| Login fails | Phase 1 | Retry once. If still failing, stop and report the error. |
| `gh` CLI not authenticated | Phase 0 (GitHub mode) | Stop. Tell user to run `gh auth login`. |
| No `## Exploratory testing scope` comment found | Phase 0 (GitHub mode) | Stop. Show the exact comment format to add. |
| Sub-agent crashes mid-flow (parallel mode) | Phase 2 | Other sub-agents continue. Mark flow as `failed: sub-agent error` in report. |
| Browser loses session mid-exploration | Phase 2 | Log findings so far, mark remaining checklist items as `skipped: session lost`, move to next flow. |
| `config.json` already exists from a prior session | Phase 0 | Ask user: reuse or start fresh? |

---

## Red Flags

| If the agent is thinking... | Reality |
|---|---|
| "This area looks fine — I didn't find anything" | Did you attempt every checklist step for every flow? |
| "I know what this component does from the source" | The code says what should happen; the browser says what does. |
| "This error always shows up, it's expected" | Document it. The user decides — then add it to `knowledge/<area>.md`. |
| "I called the API directly and it works" | UI and API hit different code paths. Browser reproduction is required. |
| "The flow name is ambiguous — I'll skip it" | Use browser discovery. Take a snapshot and navigate from what you see. |

---

## Out of Scope for POC

- GitHub comment as automated trigger (CI/bot — Phase 3)
- Auto-generation of Scout specs from findings
- Embeddings or semantic search over knowledge files
- Serverless environments

---

## Open Questions

1. Should Level 1 findings auto-open draft GitHub issues (mirroring how `bug-fix` opens draft PRs)?
2. Should the `## Exploratory testing scope` comment format become a GitHub PR template to nudge authors?
3. What is the right time budget per flow — is 4 minutes right, or should it be configurable per flow?
