# Action Ralph

Action Ralph is a three-phase GitHub Actions workflow that lets an AI agent (OpenCode) develop and test changes against the Kibana monorepo. It can create new PRs from scratch, modify existing PRs via comments, or perform read-only code reviews.

## How it works

```
Phase A: Context        Phase B: Sandbox (Inner Ralph Loop)    Phase C: Publish
(metadata only)         (no git/PR access)                     (write access)
┌──────────────┐       ┌─────────────────────────────┐        ┌──────────────────┐
│ Detect if PR │       │ Build spec from prompt       │        │ If existing PR:  │
│ or issue     │──────>│ ┌─────────────────────────┐  │───────>│   Push + comment │
│ Output refs  │       │ │ Iteration 1: run agent  │  │        │                  │
│ + branch info│       │ │ Check spec status       │  │        │ If new work:     │
│              │       │ │ Iteration 2: run agent  │  │        │   Create PR      │
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
5. The final task is always a **self-review**: the agent reviews all changes with fresh eyes, checks best practices, fixes any issues, and re-runs local checks if needed.
6. Maximum iterations (default: 5) prevents runaway costs.

This means the agent can plan its own work across sessions. Session 1 might investigate and expand the task list, session 2 implements, session 3 tests, etc.

## Trigger modes

### 1. New work: workflow_dispatch

Go to **Actions > Action Ralph > Run workflow**, enter a prompt. Creates a new PR from the repository default branch.

### 2. New work: issue comment

Comment on any issue:

```
/action-ralph <description of what to build>
```

Creates a new PR from the repository default branch with the issue body as context.

### 3. Modify existing PR: PR comment

Comment on any open PR:

```
/action-ralph <what to change on this PR>
```

Action Ralph will:
- Checkout the PR's branch (not the base branch)
- Bootstrap from that branch's state
- Run the agent loop
- Push commits directly to the PR branch (same-repo PRs)
- Post a comment on the PR with a summary of changes

If the source PR comes from a fork, Action Ralph creates a companion PR in `elastic/kibana` and comments on the source PR with the link.

### 4. Modify existing PR: code review comment

Leave a review comment on specific lines in the PR's "Files" tab:

```
/action-ralph fix this logic to handle the edge case
```

Same behavior as a regular PR comment, but OpenCode gets the file/line context.

### 5. Review mode: `/review-ralph`

Comment `/review-ralph` on any PR (as a regular comment or inline review comment):

```
/review-ralph review the error handling in this PR
```

Review mode is **read-only** -- it does not modify code. It runs in three isolated phases:

1. **Review Prepare**: Gathers PR description, recent comments, and inline review comments using GitHub read permissions.
2. **Review Sandbox**: Checks out the PR branch and runs OpenCode with `permissions: {}`. Extracts the review summary from the agent output. Any accidental file changes are discarded.
3. **Review Publish**: Posts the review summary as a comment on the PR.

Review mode only works on PRs (not issues or `workflow_dispatch`).

## Access control

Comment-triggered runs (`/action-ralph` and `/review-ralph`) are restricted to a **beta testers list** defined in the `BETA_TESTERS` env variable at the top of `action-ralph.yml`:

```yaml
env:
  BETA_TESTERS: '["flash1293","achyutjhunjhunwala","klacabane","rStelmach"]'
```

To add a new member, edit this JSON array in the workflow file **and** update the matching inline list in the job-level `if` condition (GitHub Actions does not support `env` in job-level `if`, so the list must be duplicated there). The TOCTOU mitigation step references `env.BETA_TESTERS` at runtime to re-verify the comment author.

`workflow_dispatch` bypasses the user check -- any repo collaborator with Actions access can trigger it directly.

## Security model

- **Sandboxed execution**: Both the edit and review agent jobs run with `permissions: {}`, which blocks `GITHUB_TOKEN` injection entirely. The agent has no GitHub API access.
- **Short-lived LiteLLM keys**: A scoped ephemeral key is minted per run with `max_budget: 10` and a 90-minute expiry. Only this key is passed to the agent.
- **Key revocation**: The ephemeral key is revoked immediately after the agent step completes (success or failure) via an `if: always()` cleanup step.
- **TOCTOU mitigation**: For comment triggers, the comment is re-fetched from the GitHub API at runtime and re-verified (author in beta list, slash command still present) before proceeding.
- **Publish isolation**: The publish job uses `KIBANAMACHINE_TOKEN` (PAT) for git push and PR operations. It never has access to LiteLLM keys.
- **No credential persistence**: Checkout steps use `persist-credentials: false` in sandbox jobs.

## Required secrets

Configure in **Settings > Secrets and variables > Actions**:

| Secret | Description | Already in elastic/kibana? |
|---|---|---|
| `KIBANAMACHINE_TOKEN` | PAT for the `kibanamachine` service account (git push, PR creation, comments) | Yes |
| `LITELLM_API_KEY` | Admin/master API key used only to mint short-lived run keys | No -- must add |
| `LITELLM_BASE_URL` | Base URL of your LiteLLM proxy (include `/v1`) | No -- must add |
| `LITELLM_MODEL` | Model name in your LiteLLM config (e.g. `claude-opus-4-5`) | No -- must add |

`KIBANAMACHINE_TOKEN` is already configured in the `elastic/kibana` repo. You only need to add the three `LITELLM_*` secrets.

## Fork testing

The workflow works on forks out of the box -- there are no hardcoded repo names or branch references.

- `default_branch` is auto-detected via `github.event.repository.default_branch`
- `workflow_dispatch` creates PRs targeting the fork's own default branch
- Comment triggers (`/action-ralph`, `/review-ralph`) work on the fork's PRs and issues

**Prerequisites**: configure `KIBANAMACHINE_TOKEN` and the three `LITELLM_*` secrets on the fork repo under **Settings > Secrets and variables > Actions**.

## Runner configuration

Use the `runner` input on `workflow_dispatch` to choose the runner label for Phases A and B. Default is `ubuntu-latest`.

## Agent loop configuration

| Input | Default | Description |
|---|---|---|
| `max_iterations` | `5` | Maximum agent loop iterations before stopping |
| `model` | (from `LITELLM_MODEL`) | Override the AI model (`provider/model` format) |
| `runner` | `ubuntu-latest` | Runner label used by prepare and sandbox jobs |

## Files

| File | Purpose |
|---|---|
| `.github/workflows/action-ralph.yml` | The workflow definition |
| `action-ralph/AGENT_LOOP_PROTOCOL.md` | Protocol injected into every agent prompt |
| `action-ralph/validation.md` | Validation checklist for the agent |
| `action-ralph/lessons_learned.md` | Kibana-specific gotchas and patterns |

## Timeouts and cost guardrails

| Phase | Timeout | Purpose |
|---|---|---|
| A: Resolve Context | 45 min | Resolves trigger context/refs with timeout guard |
| B: Agent Loop | 120 min | Caps total agent reasoning time |
| B: Review Sandbox | 30 min | Caps review analysis time |
| C: Publish | 10 min | Quick git push + PR creation |
| C: Review Publish | 10 min | Post review comment |

Concurrency groups prevent parallel runs for the same issue/PR.

## Notifications

New PRs are created as drafts and ping `@flash1293` in the PR body. PR update comments also ping `@flash1293`.

## Quick smoke test

1. Ensure `KIBANAMACHINE_TOKEN` exists and add the three `LITELLM_*` secrets.
2. Go to **Actions > Action Ralph > Run workflow**.
3. Enter: `Add a comment to the top of package.json saying "Hello from Action Ralph"`.
4. Watch the run. Phase A resolves context, Phase B checks out/bootstraps and runs the agent loop, Phase C opens a draft PR and pings @flash1293.

## Overriding the model

The `model` input on `workflow_dispatch` accepts any OpenCode `provider/model` string. Leave it empty to use `litellm/<LITELLM_MODEL>`.
