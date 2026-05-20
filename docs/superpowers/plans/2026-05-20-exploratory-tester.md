# Exploratory Tester Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write `exploratory-tester/SKILL.md` — a skill that drives a real browser to explore Kibana Security Solution features, collects structured evidence, and reports findings classified by confidence.

**Architecture:** A single `SKILL.md` agent instruction file with two execution modes (single and parallel). Single mode runs all flows sequentially in one agent. Parallel mode has an orchestrator dispatch one sub-agent per flow, then merges findings. Both modes share the same explore loop logic. Session artefacts are written to `.exploratory-session/` (gitignored). Accumulated team knowledge lives in committed `knowledge/<area>.md` files.

**Tech Stack:** Markdown (SKILL.md agent instructions), playwright-mcp (browser), Scout (Kibana test server), `gh` CLI (GitHub issue fetching), bash (wait loops, connectivity checks).

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md` | Create | Agent instructions — the entire skill |
| `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/.gitkeep` | Create | Keeps the knowledge/ directory in git before the first session |
| `.gitignore` (repo root) | Modify | Add `.exploratory-session/` |

---

## Task 1: Repository Setup

**Files:**
- Create: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/.gitkeep`
- Modify: `.gitignore` (repo root)

- [ ] **Step 1: Create the skill directory and knowledge placeholder**

```bash
mkdir -p x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge
touch x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/.gitkeep
```

- [ ] **Step 2: Add `.exploratory-session/` to .gitignore**

Open `.gitignore` at the repo root and add this line in the section with other session/artefact exclusions:

```
.exploratory-session/
```

- [ ] **Step 3: Verify**

```bash
git status x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/
```

Expected output: new untracked directory `exploratory-tester/` with `knowledge/.gitkeep` inside.

```bash
grep 'exploratory-session' .gitignore
```

Expected: `.exploratory-session/`

- [ ] **Step 4: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/.gitkeep .gitignore
git commit -m "feat(exploratory-tester): scaffold skill directory and gitignore session artefacts"
```

---

## Task 2: SKILL.md — Header, Invocation, and Phase 0 (Input Parsing)

**Files:**
- Create: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md`

- [ ] **Step 1: Write the SKILL.md header through Phase 0**

Create the file with this exact content:

````markdown
---
name: exploratory-tester
description: >
  Use when the user wants to perform exploratory testing on Kibana Security Solution.
  Invoke inline with an area and flows, or point at a GitHub issue/PR number that contains
  an "## Exploratory testing scope" comment.
  Supports stateful-classic, stateful-ess, and serverless environments — agent-managed or user-provided.
---

# Exploratory Tester

Explore a feature area of Kibana Security Solution through the browser, collect structured evidence, and report findings classified by confidence. The agent drives a real browser — not code analysis or API calls.

**Execute phases 0 → 1 → 2 → 3 in strict order.** Each phase produces artefacts the next depends on. Never skip a phase.

## Quick Reference

| Phase | What it does | Exit condition |
|-------|-------------|----------------|
| **0 — Setup** | Parse scope, start environment (agent-managed) or verify (user-provided), fetch known bugs, write `config.json` | `config.json` written |
| **1 — Wait & Login** | Wait for Kibana ready, log in, set up data, confirm scope with user | User confirms: proceed |
| **2 — Explore** | Walk every flow using checklist + timebox, write findings immediately | Every flow has ≥1 entry in its `findings-flow-N.md` |
| **3 — Report** | Merge findings, classify, filter known noise, present to user, update knowledge | User has reviewed the report |

## How to invoke

**Inline — single mode (default):**
```
Read and follow exploratory-tester/SKILL.md
Area: SIEM Migrations dashboards
Flows:
  - rename with special characters
  - cancel mid-progress
    entry: SIEM Migrations > Dashboards > click rename on any migration card
    expected: migration returns to previous state, no orphaned process
Setup: Bedrock connector, role: t1_analyst
```

**Inline — parallel mode:**
```
Read and follow exploratory-tester/SKILL.md in parallel mode
Area: ...
```

**GitHub issue or PR:**
```
Read and follow exploratory-tester/SKILL.md for issue #12345
Read and follow exploratory-tester/SKILL.md in parallel mode for PR #12345
```

**With explicit environment (append to either form above):**
```
# Agent-managed non-default:
Environment:
  type: serverless
  project-type: security

# User-provided:
Environment:
  url: $KIBANA_TEST_URL
  username: $KIBANA_TEST_USERNAME
  password: $KIBANA_TEST_PASSWORD
  data-setup: skip
```

## Red Flags — Stop and re-read the phase

| If you're thinking this... | Reality |
|---|---|
| "This area looks fine — I didn't find anything" | Did you attempt every checklist step for every flow? |
| "I know what this component does from the source" | The code says what should happen; the browser says what does. |
| "This error always shows up, it's expected" | Document it. The user decides — then add it to `knowledge/<area-slug>.md`. |
| "I called the API directly and it works" | UI and API hit different code paths. Browser reproduction is required. |
| "The flow name is ambiguous — I'll skip it" | Use browser discovery: take a snapshot and navigate from what you see. |

---

## Phase 0: Setup

**Start this phase immediately — environment boot runs while input is parsed.**

### Step 0a — Start or verify environment

Determine environment type. Default is `stateful-classic` if no `Environment` section is in the input.

**Agent-managed** (`Environment.url` is absent):

| `Environment.type` | Command |
|---|---|
| `stateful-classic` (default) | `node scripts/scout.js start-server --arch stateful --domain classic &` |
| `stateful-ess` | `node scripts/scout.js start-server --arch stateful --domain ess &` |
| `serverless` | `node scripts/scout.js start-server --arch serverless --projectType <project-type> &` |

If Scout is already running on port 5620 — reuse it. Tell the user an existing session is being reused.

**User-provided** (`Environment.url` is present): skip Scout startup. Verify connectivity:
```bash
curl -s -u "<username>:<password>" "<url>/api/status" \
  | python3 -c "import sys,json; s=json.load(sys.stdin); \
    exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)"
```
If unreachable — **stop** and tell the user to check the environment.

Resolve env var references in credentials (`$VAR` → environment variable value) before using them.

### Step 0b — Parse input

**Inline mode:** extract `Area`, `Flows`, `Setup`, `Environment`, and `mode` directly from the invocation text.

**GitHub mode:**
```bash
# For issue:
gh issue view <NUMBER> --repo elastic/kibana --json number,title,body,comments
# For PR:
gh pr view <NUMBER> --repo elastic/kibana --json number,title,body,comments
```

If `gh` returns an authentication error — **stop** and tell the user to run `gh auth login`.

Find the **latest** comment whose body contains `## Exploratory testing scope`. Parse:
- `### Area` → area name
- `### Flows` → list (each item may have `entry:` and `expected:` sub-fields)
- `### Setup` → connector and role requirements
- `### Environment` → optional, same keys as inline

If no `## Exploratory testing scope` comment is found — **stop** and show the user this exact format:

```markdown
## Exploratory testing scope

### Area
<feature area name>

### Flows
- <flow name>
  entry: <navigation path — optional>
  expected: <correct outcome — optional>

### Setup
- <connector or role requirement, one per line>
```

### Step 0c — Resolve role and area slug

**Area slug:** lowercase the Area value, replace spaces with hyphens.
`"SIEM Migrations dashboards"` → `siem-migrations-dashboards`

**Role resolution for serverless environments:**

| Scope role | Serverless project role |
|---|---|
| `t1_analyst` | `viewer` |
| `t2_analyst` | `editor` |
| `admin` | `admin` |
| Any unrecognised role | Warn user, use `viewer`, add to `skipped_setup` |

For stateful environments: use the scope role as-is.

### Step 0d — Fetch known bugs

```bash
gh issue list --repo elastic/kibana --state open \
  --search "<area keywords from area name>" \
  --json number,title,labels --limit 10
gh issue list --repo elastic/kibana --state closed \
  --search "<area keywords from area name>" \
  --json number,title,closedAt --limit 5
```

### Step 0e — Write config.json

Create `.exploratory-session/` if it doesn't exist.

If `.exploratory-session/config.json` already exists — ask the user: **"An existing session config was found. Reuse it (r) or start fresh (f)?"** Wait for their answer.

Write `.exploratory-session/config.json`:
```json
{
  "area": "<area name from input>",
  "area_slug": "<area-slug>",
  "mode": "<single | parallel>",
  "environment": {
    "type": "<stateful-classic | stateful-ess | serverless | user-provided>",
    "url": "<resolved url>",
    "managed": true
  },
  "flows": [
    {
      "name": "<flow name>",
      "entry": "<entry path or null>",
      "expected": "<expected outcome or null>",
      "timeout_minutes": 4
    }
  ],
  "setup": {
    "connectors": ["<connector names>"],
    "role": "<scope role>",
    "resolved_role": "<resolved role>"
  },
  "skipped_setup": [],
  "known_open_bugs": [{ "number": 0, "title": "" }],
  "recently_closed_bugs": [{ "number": 0, "title": "", "closedAt": "" }]
}
```

Read `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md` if it exists — load its contents as context for Phase 2.
````

- [ ] **Step 2: Verify the file was written**

```bash
head -5 x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
```

Expected: the frontmatter block starting with `---`

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
git commit -m "feat(exploratory-tester): add SKILL.md header, invocation guide, and Phase 0"
```

---

## Task 3: SKILL.md — Phase 1 (Wait, Login, Data Setup)

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md`

- [ ] **Step 1: Append Phase 1 to SKILL.md**

Append this section after the Phase 0 content:

````markdown

---

## Phase 1: Wait & Login

### Step 1a — Wait for Kibana (agent-managed only)

Skip this step if `environment.managed` is `false` in `config.json`.

```bash
until curl -s -u elastic:changeme http://localhost:5620/api/status \
  | python3 -c "import sys,json; s=json.load(sys.stdin); \
    exit(0 if s.get('status',{}).get('overall',{}).get('level')=='available' else 1)" \
  2>/dev/null; do echo "Waiting for Kibana..."; sleep 10; done
```

If not available after **10 minutes** — **stop** and tell the user to check the Scout server output.

### Step 1b — Log in via browser

Navigate to `<environment.url>/login?auth_provider_hint=cloud-basic`.

Fill credentials:
- Agent-managed environments: username `elastic`, password `changeme`
- User-provided environments: username and password from `config.json` environment block

If login fails — retry once with a fresh navigation. If still failing — **stop** and report the exact error message visible in the browser.

### Step 1c — Set up test data

Check environment capabilities before each step. Record every skipped step in `config.json` → `skipped_setup` with its reason.

**Connectors** (all environment types):
```bash
# Create Bedrock connector (stateful):
curl -s -u elastic:changeme -X POST http://localhost:5620/api/actions/connector \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"name":"Bedrock","connector_type_id":".bedrock","config":{"apiUrl":"https://bedrock.us-east-1.amazonaws.com"},"secrets":{"accessKey":"test","secret":"test"}}'
```
For user-provided environments: replace URL and credentials. For serverless: same endpoint, credentials from config.

**esArchiver fixtures (stateful environments only):**

If the scope `Setup` section lists esArchiver fixtures, load them via the Kibana API. For serverless, attempt the load — if the response is 404 or 400, skip and add to `skipped_setup`:
```
{ "step": "esArchiver:<fixture-name>", "reason": "not supported in serverless: <error>" }
```

**Roles and users (stateful only):**

Create the test role and user via the security API. For serverless, skip role/user creation entirely — the `resolved_role` from `config.json` is the project-level role that was already mapped. Add to `skipped_setup`:
```
{ "step": "role-creation:<role>", "reason": "serverless uses project roles — resolved to <resolved_role>" }
```

### Step 1d — Confirm with user

Present a confirmation before starting exploration:

> "Kibana ready (`<environment.type>` at `<environment.url>`).
> Exploring **`<area>`** with role **`<resolved_role>`**.
> Flows: `<flow names, comma-separated>`
> Skipped setup: `<skipped_setup list, or 'none'>`
> Proceed?"

Wait for the user's reply before moving to Phase 2.

In `mode: auto` — skip this confirmation. Proceed immediately.
````

- [ ] **Step 2: Verify append**

```bash
grep -n "Phase 1" x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
```

Expected: a line with `## Phase 1: Wait & Login`

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
git commit -m "feat(exploratory-tester): add Phase 1 — wait, login, data setup"
```

---

## Task 4: SKILL.md — Phase 2 Single Mode (Explore Loop + Finding Format)

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md`

- [ ] **Step 1: Append Phase 2 single mode and explore loop to SKILL.md**

Append this section:

````markdown

---

## Phase 2: Explore

### Single mode

For each flow in `config.json` flows array (in order), run the Explore Loop below. Do not move to the next flow until the current one is complete.

### The Explore Loop (per flow)

**Termination: mandatory checklist complete OR timebox expired — whichever fires first.**

Default timebox: `timeout_minutes` from the flow in `config.json` (default 4 minutes). Track elapsed time from the first checklist step.

**Mandatory checklist — attempt in this order:**

| Step | What to attempt |
|---|---|
| 1 | **Happy path** — execute the flow exactly as intended |
| 2 | **Missing prerequisites** — remove one required setup item (e.g. delete the connector) and retry |
| 3 | **Invalid/edge-case input** — empty strings, special characters (`'`, `"`, `<`, `>`), max length, wrong type |
| 4 | **Cancel / back-navigate mid-flow** — start the flow, then cancel or navigate away before completion |
| 5 | **Refresh during in-flight operation** — start the flow, trigger a server call, immediately refresh the page |

**At every checklist step, before and after the action:**
1. `browser_console_messages` — capture any new messages
2. `browser_network_requests` — capture requests triggered by the action
3. `browser_take_screenshot` — capture the resulting UI state
4. Append one entry to `findings-flow-N.md` **immediately** — even if nothing went wrong (record what was attempted and what happened)

**How to navigate to the flow:**
1. Use `entry` from `config.json` if provided — navigate exactly as described
2. If no `entry`: call `browser_snapshot`, read the visible UI, navigate to the area from what's on screen
3. Check `knowledge/<area_slug>.md` for navigation patterns accumulated from prior sessions
4. If the flow name is still ambiguous after the snapshot: take a screenshot, describe what you see, choose the most reasonable interpretation and proceed — never skip

**If timebox fires before checklist completes:** log remaining steps as:
```
skipped: time budget exhausted (N minutes elapsed)
```

**If checklist completes before timebox:** probe one or two unexpected UI states noticed during the checklist, or follow a single hint from findings so far. Do not start new flows or navigate to unrelated areas.

**If the browser session is lost mid-flow:** log findings collected so far, mark remaining checklist steps as `skipped: session lost`, continue with the next flow.

---

## Finding Format

Each entry appended to `.exploratory-session/findings-flow-N.md`:

```markdown
## Finding: [short descriptive title]

**Level:** <1 | 2 | 3>
**Flow:** <flow name from config.json>
**Role:** <resolved_role from config.json>
**Checklist step:** <N — step description>

### Steps followed
1. <exact action — literal, not a summary>
2. <exact action>

### Current behavior
<what actually happened — include error messages verbatim, HTTP status codes, console output>

### Expected behavior
<what should have happened — use config.json expected field, or state the heuristic used>

### Why this might be an issue
<mandatory for Level 1 and 2: commit to reasoning, explain user impact>

### Evidence
- Screenshot: `.exploratory-session/screenshots/<filename>.png`
- Console: `<relevant line — one line, not a dump>`
- Network: <METHOD> `<path>` → <status> `<relevant response snippet>`
```

**Level rules:**
- **Level 1** — JS exception in console, HTTP 5xx on any in-flow request, or current behavior directly contradicts the `expected` field in `config.json` under the same setup → agent decides: confirmed bug
- **Level 2** — Unexpected 4xx, element that should be present is missing, layout visibly broken, action completes with no user feedback → agent flags: user decides
- **Level 3** — `console.warn`, transient spinner, unclassifiable observation → listed, not flagged

**For Level 3 findings:** omit `### Expected behavior` and `### Why this might be an issue`. Use this shorter format:
```markdown
## Observation: [title]

**Level:** 3
**Flow:** <flow name>
**Role:** <resolved_role>
**Checklist step:** <N — description>

### Current behavior
<what was observed>

### Evidence
- Console: `<line>`
```
````

- [ ] **Step 2: Verify**

```bash
grep -n "Explore Loop\|Finding Format\|Level rules" x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
```

Expected: lines for all three headings.

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
git commit -m "feat(exploratory-tester): add Phase 2 explore loop (single mode) and finding format"
```

---

## Task 5: SKILL.md — Phase 2 Parallel Mode

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md`

- [ ] **Step 1: Append the parallel mode orchestrator section**

Find the `### Single mode` section and append the parallel mode section directly after `### The Explore Loop` section:

````markdown

---

### Parallel mode

The orchestrator dispatches one sub-agent per flow concurrently.

**Orchestrator steps:**
1. Read `config.json` — confirm `mode` is `parallel`
2. Assign each flow an index N (1-based)
3. Dispatch sub-agents concurrently via the Agent tool. Each sub-agent prompt must include:

```
You are a sub-agent for the exploratory-tester skill.
Your task: run the Explore Loop (defined in Phase 2 of the skill) for this single flow.

Flow: <flow object as JSON>
config.json path: .exploratory-session/config.json
findings file path: .exploratory-session/findings-flow-<N>.md
knowledge file path: x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md

Read config.json for environment details, resolved_role, area, and known_open_bugs.
Read the knowledge file if it exists — use it to recognise known non-bugs.
Run the Explore Loop for your assigned flow.
Write all findings to findings-flow-<N>.md.
Do NOT write to the knowledge file.
Exit when the flow is complete or the timebox expires.
```

4. Wait for all sub-agents to complete
5. If a sub-agent crashes or does not produce a findings file: create `findings-flow-N.md` with a single entry:
```markdown
## Finding: Sub-agent failure

**Level:** 3
**Flow:** <flow name>
**Role:** <resolved_role>
**Checklist step:** N/A

### Current behavior
Sub-agent did not complete. No findings collected for this flow.
```
6. Proceed to Phase 3 once all findings files exist (one per flow)

**Sub-agent rules:**
- Sub-agents are stateless — they read `config.json` and the knowledge file, write their findings file, and exit
- Sub-agents read `knowledge/<area_slug>.md` but **never write to it**
- A sub-agent crashing does not block other sub-agents
````

- [ ] **Step 2: Verify**

```bash
grep -n "Parallel mode\|Sub-agent\|orchestrator" x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
```

Expected: lines for all three terms.

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
git commit -m "feat(exploratory-tester): add Phase 2 parallel mode orchestrator"
```

---

## Task 6: SKILL.md — Phase 3 (Report, Filter, Knowledge Update)

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md`

- [ ] **Step 1: Append Phase 3 to SKILL.md**

Append this section:

````markdown

---

## Phase 3: Report

### Step 3a — Merge findings

Read all `.exploratory-session/findings-flow-N.md` files. Write `.exploratory-session/report.md`:

```markdown
# Exploratory Testing Report

**Area:** <area>
**Environment:** <environment.type> at <environment.url>
**Role:** <resolved_role>
**Date:** <today's date>
**Mode:** <single | parallel>
**Flows explored:** <N>

## Summary
- Level 1 (confirmed bugs): N
- Level 2 (suspicious — your review needed): N
- Level 3 (observations): N
- Skipped (time budget / session lost): N
- Known / suppressed: N

## Level 1 — Confirmed Bugs
<all Level 1 findings in full finding format>

## Level 2 — Suspicious
<all Level 2 findings in full finding format>

## Level 3 — Observations
<all Level 3 findings in short format>

## Skipped
| Flow | Checklist step | Reason |
|---|---|---|
| <flow name> | <step> | time budget exhausted / session lost |

## Known / Suppressed
| Finding | Reason suppressed |
|---|---|
| <title> | Matches knowledge/<area_slug>.md: "<entry>" |
| <title> | Matches known open bug #<number>: "<title>" |
```

### Step 3b — Filter known noise

For each Level 2 and Level 3 finding, check in this order:
1. Does it match an entry in `knowledge/<area_slug>.md`? If yes → move to "Known / Suppressed", cite the matching entry
2. Does it match a `known_open_bugs` entry in `config.json`? If yes → move to "Known / Suppressed", cite the issue number

**Never silently drop a finding.** Every suppressed finding must appear in "Known / Suppressed" with the reason.

Level 1 findings are never suppressed by the knowledge file — a confirmed bug is always reported.

### Step 3c — Present report

Present `report.md` to the user and ask:

> "Review complete. Are there any Level 2 or Level 3 findings you want to reclassify as false positives before I update the knowledge file?"

Wait for the user's response. Apply any reclassifications to `report.md`.

In `mode: auto`: skip this step. Post the content of `report.md` as a comment on the source GitHub issue or PR:
```bash
gh issue comment <NUMBER> --repo elastic/kibana --body "$(cat .exploratory-session/report.md)"
# or for PRs:
gh pr comment <NUMBER> --repo elastic/kibana --body "$(cat .exploratory-session/report.md)"
```

### Step 3d — Update knowledge file

After user review (or immediately in `mode: auto`), update `knowledge/<area_slug>.md`.

If the file does not exist, create it at:
`x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md`

With this initial structure:
```markdown
# Knowledge: <area name>

## Known non-bugs
<!-- Behaviours the agent should not re-report as findings -->

## Navigation patterns
<!-- How to reach features in this area — built up across sessions -->
```

Append confirmed false positives (findings the user dismissed or reclassified) to `## Known non-bugs`. Append any navigation patterns discovered during this session that weren't already in the file to `## Navigation patterns`.

Commit the knowledge file:
```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/<area_slug>.md
git commit -m "knowledge(exploratory-tester): update <area_slug> after session on <date>"
```
````

- [ ] **Step 2: Verify**

```bash
grep -n "Phase 3\|Step 3a\|Step 3b\|Step 3c\|Step 3d" x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
```

Expected: all four steps present.

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
git commit -m "feat(exploratory-tester): add Phase 3 — report, noise filter, knowledge update"
```

---

## Task 7: SKILL.md — Failure Handling

**Files:**
- Modify: `x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md`

- [ ] **Step 1: Append failure handling table to SKILL.md**

Append this section at the end of the file:

````markdown

---

## Failure Handling

| Failure | When | Response |
|---|---|---|
| Scout server not available within 10 minutes | Phase 1 (agent-managed) | **Stop.** Tell user to check Scout server output (`node scripts/scout.js start-server` logs). |
| Scout already running on port 5620 | Phase 0 (agent-managed) | Reuse. Tell user an existing session is being reused. |
| User-provided environment unreachable | Phase 0 | **Stop.** Tell user to check the environment URL and credentials. |
| Login fails after one retry | Phase 1 | **Stop.** Report the exact error visible in the browser. |
| `gh` CLI not authenticated | Phase 0 (GitHub mode) | **Stop.** Tell user to run `gh auth login`. |
| No `## Exploratory testing scope` comment found | Phase 0 (GitHub mode) | **Stop.** Show the exact comment format to add (see Phase 0 Step 0b). |
| Sub-agent crashes in parallel mode | Phase 2 | Continue with other flows. Mark the crashed flow as `failed: sub-agent error` in the report. |
| Browser session lost mid-exploration | Phase 2 | Log findings collected so far. Mark remaining checklist steps as `skipped: session lost`. Continue with next flow. |
| `config.json` already exists | Phase 0 | Ask user: reuse existing session or start fresh? Wait for answer. |
| esArchiver load fails in serverless | Phase 1 | Skip. Add to `skipped_setup` with reason. Continue — never fail hard on setup steps. |
| Role unrecognised in serverless | Phase 0 | Warn user. Use `viewer`. Add to `skipped_setup`. |
````

- [ ] **Step 2: Verify final SKILL.md structure**

```bash
grep -n "^## " x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
```

Expected output (one line per top-level section):
```
## Quick Reference
## How to invoke
## Red Flags — Stop and re-read the phase
## Phase 0: Setup
## Phase 1: Wait & Login
## Phase 2: Explore
## Finding Format
## Phase 3: Report
## Failure Handling
```

- [ ] **Step 3: Commit**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
git commit -m "feat(exploratory-tester): add failure handling — complete skill file"
```

---

## Task 8: Validation Session 1

Validate the skill produces real browser output, real findings, and a usable report. This is the acceptance test for the entire implementation.

**Prerequisites:**
- `gh` CLI authenticated (`gh auth login`)
- playwright-mcp configured in `~/.claude/mcp.json`
- `yarn kbn bootstrap` completed

- [ ] **Step 1: Invoke the skill against SIEM Migrations**

In a new Claude Code session, invoke:

```
Read and follow x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
Area: SIEM Migrations dashboards
Flows:
  - rename a migration
    entry: Security > SIEM Migrations > Dashboards tab
    expected: migration name updates correctly
  - cancel a translation mid-progress
Setup: Bedrock connector, role: t1_analyst
```

- [ ] **Step 2: Verify Phase 0 output**

After Phase 0:
```bash
cat .exploratory-session/config.json
```
Expected: valid JSON with `area`, `flows` array (2 items), `environment.type: "stateful-classic"`, `known_open_bugs` array.

- [ ] **Step 3: Verify Phase 1 completes**

The agent should:
- Start Scout and wait for `localhost:5620` to be available
- Log in via browser
- Ask for confirmation before proceeding

Confirm "proceed" when asked.

- [ ] **Step 4: Verify Phase 2 produces real findings**

After Phase 2:
```bash
ls .exploratory-session/findings-flow-*.md
```
Expected: at least 2 files (one per flow).

```bash
cat .exploratory-session/findings-flow-1.md
```
Expected: at least one finding with `## Finding:` heading, `### Steps followed`, `### Current behavior`, `### Evidence` sections populated with real browser data (not placeholders).

```bash
ls .exploratory-session/screenshots/
```
Expected: at least one screenshot per flow.

- [ ] **Step 5: Verify Phase 3 produces a usable report**

```bash
cat .exploratory-session/report.md
```
Expected:
- Summary section with counts
- At least one finding outside the "Known / Suppressed" section
- No finding in Level 1 or 2 that is obviously the same as what a passing test would catch (no false positives from the happy path)
- Skipped section present (may be empty)

- [ ] **Step 6: Verify knowledge file created**

```bash
cat x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/siem-migrations-dashboards.md
```
Expected: file exists with `## Known non-bugs` and `## Navigation patterns` sections populated from the session.

- [ ] **Step 7: Commit validation artefacts**

```bash
git add x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/knowledge/siem-migrations-dashboards.md
git commit -m "knowledge(exploratory-tester): initial siem-migrations-dashboards knowledge from Session 1"
```

- [ ] **Step 8: Record Session 1 results**

Update the spec at `docs/superpowers/specs/2026-05-20-exploratory-tester-design.md` — add a `## Session 1 Results` section noting:
- Total time from invocation to report
- Number of findings at each level
- Whether any finding was a genuine issue outside the test's assertion set
- Any SKILL.md adjustments needed based on what the agent actually did

---

## Self-review notes

- All phase cross-references are consistent: Phase 0 writes `config.json`, Phase 1 reads it, Phase 2 reads it, Phase 3 reads findings files
- `area_slug` is computed in Phase 0 Step 0c and used consistently for knowledge file paths throughout
- The sub-agent prompt in Task 5 references "the Explore Loop (defined in Phase 2 of the skill)" — this only works because the sub-agent is given the full SKILL.md to read; the prompt must include the skill path
- `mode: auto` branches are present in Phase 1d (skip confirmation) and Phase 3c (post as comment) — consistent
- Serverless `data-setup: skip` default for user-provided environments is documented in the input format but enforced in Phase 1c — covered
- Knowledge file commit in Task 6 uses the knowledge file path — consistent with Task 8 verification step
