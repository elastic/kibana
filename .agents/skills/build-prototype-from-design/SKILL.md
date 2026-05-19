---
name: build-prototype-from-design
description: Builds a working Kibana prototype from a design screenshot or description. Use when asked to 'build this design', 'prototype this', 'implement this UI', 'add this panel', 'replace this component', or 'run/start Kibana' for prototyping in Kibana. Produces real EUI-based code in the examples/ directory. Never intended to be merged — optimised for speed and visual fidelity over production readiness.
---

# Build prototype from design

Prototype workflow for Kibana. Optimise for speed and visual fidelity, not production readiness.

## Workflow

1. **Process input** — screenshot, Figma URL, or description.
2. **Scope** — full plugin vs light touch on existing UI. If a plugin is needed, follow [build-plugin](references/build-plugin.md).
3. **Run Kibana** — follow [run-kibana](references/run-kibana.md). **Must be non-blocking** (see below).
4. **Ingest data** — [ingest-data](references/ingest-data.md).
5. **Version panel** — [build-version-panel](references/build-version-panel.md).

## Run Kibana — non-blocking (required)

When the user asks to run or start Kibana (or step 3 needs a dev stack), **do not block the chat** on ES/Kibana startup.

### Main agent

1. Read [run-kibana](references/run-kibana.md) (agent section at top).
2. **Fast-path first** (seconds): `curl` ES (`:9200`) and Kibana (`:5601/api/status`); check `node_modules/.yarn-integrity`.
   - Both `200` → tell user stack is already up; **stop**.
   - ES up, Kibana down → delegate **Kibana only** (common after a laptop sleep or closed terminal).
   - Neither up, bootstrap OK → delegate ES + Kibana in parallel; **skip bootstrap**.
   - Bootstrap missing → `yarn kbn bootstrap` once, then start what's still down.
3. **Delegate** only the needed starts to a **background shell agent** (Task `subagent_type: "shell"`) using the prompt in run-kibana.md.
4. **Reply immediately** after launching the Task with what was skipped vs started, URL, credentials, and warmup time.
5. **Forbidden in the main chat:** re-running bootstrap when `.yarn-integrity` exists; multi-minute `Await`; starting ES when `:9200` already returns `200`.

### Background shell agent (Task)

The shell subagent must:

- Re-run fast-path checks if the main agent did not.
- Start **only** what is down (`block_until_ms: 0`, `nvm use` from repo root).
- **Kibana-only** when ES is already running — one background shell, fastest repeat path.
- **ES + Kibana in parallel** when both are down and bootstrap is OK.
- Exit quickly; do not hold the subagent open for full readiness unless the user explicitly asked to wait.

### If Task is unavailable

Fire **two Shell commands in parallel** in one message, each with `block_until_ms: 0`, then return to the user without long polling.

### Tell the user

- http://localhost:5601 — `elastic` / `changeme`
- What was skipped (e.g. "ES still running, only started Kibana")
- Ready in ~1–2 minutes if only Kibana restarted; ~2–5 minutes on cold start
