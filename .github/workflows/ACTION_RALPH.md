# Action Ralph

Action Ralph is a three-phase GitHub Actions workflow that lets an AI agent (OpenCode) develop and test changes against the Kibana monorepo. It can create new PRs from scratch or modify existing PRs via comments.

## How it works

```
Phase A: Bootstrap      Phase B: Sandbox (Inner Ralph Loop)    Phase C: Publish
(high privilege)        (no git/PR access)                     (write access)
┌──────────────┐       ┌─────────────────────────────┐        ┌──────────────────┐
│ Detect if PR │       │ Build spec from prompt       │        │ If existing PR:  │
│ or issue     │──────>│ ┌─────────────────────────┐  │───────>│   Push + comment │
│ Checkout     │       │ │ Iteration 1: run agent  │  │        │                  │
│ Bootstrap    │       │ │ Check spec status       │  │        │ If new work:     │
│ Upload       │       │ │ Iteration 2: run agent  │  │        │   Create PR      │
└──────────────┘       │ │ ...until done/aborted   │  │        └──────────────────┘
                       │ └─────────────────────────┘  │
                       │ Package changes + reasoning  │
                       └─────────────────────────────┘
```

### Inner Ralph Loop (from joes-ralphies)

The core innovation borrowed from [joes-ralphies](https://github.com/joereuter/joes-ralphies) is the **spec-driven agent loop**:

1. A **spec file** is created with `## Status`, `## Tasks`, `## Additional Context`, and `## Definition of done`.
2. The agent is invoked repeatedly, each time seeing the **protocol + spec** as its prompt.
3. Each iteration, the agent picks the first unchecked task, executes it, updates the spec, and exits.
4. The loop checks `## Status` -- if `done` or `aborted`, the loop exits. Otherwise, the next iteration runs with fresh context but the updated spec.
5. Maximum iterations (default: 5) prevents runaway costs.

This means the agent can plan its own work across sessions. Session 1 might investigate and expand the task list, session 2 implements, session 3 tests, etc.

## Trigger modes

### 1. New work: workflow_dispatch

Go to **Actions > Action Ralph > Run workflow**, enter a prompt. Creates a new PR from `main`.

### 2. New work: issue comment

Comment on any issue:

```
/action-ralph <description of what to build>
```

Creates a new PR from `main` with the issue body as context.

### 3. Modify existing PR: PR comment

Comment on any open PR:

```
/action-ralph <what to change on this PR>
```

Action Ralph will:
- Checkout the PR's branch (not `main`)
- Bootstrap from that branch's state
- Run the agent loop
- Push commits directly to the PR branch
- Post a comment on the PR with a summary of changes

### 4. Modify existing PR: code review comment

Leave a review comment on specific lines in the PR's "Files" tab:

```
/action-ralph fix this logic to handle the edge case
```

Same behavior as a regular PR comment, but OpenCode gets the file/line context.

## Required secrets

Configure in **Settings > Secrets and variables > Actions**:

| Secret | Description | Already in elastic/kibana? |
|---|---|---|
| `KIBANAMACHINE_TOKEN` | PAT for the `kibanamachine` service account (git push, PR creation, comments) | Yes |
| `LITELLM_API_KEY` | API key for your LiteLLM proxy | No -- must add |
| `LITELLM_BASE_URL` | Base URL of your LiteLLM proxy (include `/v1`) | No -- must add |
| `LITELLM_MODEL` | Model name in your LiteLLM config (e.g. `claude-opus-4-5`) | No -- must add |

`KIBANAMACHINE_TOKEN` is already configured in the `elastic/kibana` repo. You only need to add the three `LITELLM_*` secrets.

## Runner configuration

Defaults to `ubuntu-24.04-arm64-8core` for Phases A and B. To test without custom runners, change `runs-on` to `ubuntu-latest` in the `prepare` and `sandbox` jobs.

## Agent loop configuration

| Input | Default | Description |
|---|---|---|
| `max_iterations` | `5` | Maximum agent loop iterations before stopping |
| `model` | (from `LITELLM_MODEL`) | Override the AI model (`provider/model` format) |

## Files

| File | Purpose |
|---|---|
| `.github/workflows/action-ralph.yml` | The workflow definition |
| `.github/action-ralph/AGENT_LOOP_PROTOCOL.md` | Protocol injected into every agent prompt |

## Timeouts and cost guardrails

| Phase | Timeout | Purpose |
|---|---|---|
| A: Bootstrap | 30 min | Prevents hung `yarn install` |
| B: Agent Loop | 45 min | Caps total agent reasoning time |
| C: Publish | 10 min | Quick git push + PR creation |

Concurrency groups prevent parallel runs for the same issue/PR.

## Notifications

New PRs are created as drafts and ping `@flash1293` in the PR body. PR update comments also ping `@flash1293`.

## Quick smoke test

1. Ensure `KIBANAMACHINE_TOKEN` exists and add the three `LITELLM_*` secrets.
2. Go to **Actions > Action Ralph > Run workflow**.
3. Enter: `Add a comment to the top of package.json saying "Hello from Action Ralph"`.
4. Watch the run. Phase A bootstraps (~10-20 min), Phase B runs the agent loop, Phase C opens a draft PR and pings @flash1293.

## Overriding the model

The `model` input on `workflow_dispatch` accepts any OpenCode `provider/model` string. Leave it empty to use `litellm/<LITELLM_MODEL>`.
