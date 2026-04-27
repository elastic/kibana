name: Backlog Grooming Agent
timeout-minutes: 45
description: >-
  Reacts to issues labeled `backlog-groom`, determines if the issue is stale or still valid,
  and either recommends closing or implements a fix with a linked pull request.
on:
  issues:
    types: [opened, labeled]
  status-comment: true
  permissions:
    contents: read
    issues: write
    pull-requests: read
  steps:
    - name: Qualify trigger event
      id: qualify_trigger
      uses: actions/github-script@v9
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        script: |
          'use strict';
          const FACTORY_LABEL = 'backlog-groom';
          const eventName = context.eventName;
          const eventAction = context.payload.action;
          const labelName = context.payload.label?.name ?? '';
          const issueLabels = (context.payload.issue?.labels ?? []).map(l => l.name);

          let eligible = false;
          let reason = '';

          if (eventName !== 'issues') {
            reason = `Unsupported event '${eventName}'; expected 'issues'.`;
          } else if (eventAction === 'labeled' && labelName === FACTORY_LABEL) {
            eligible = true;
            reason = `Issue labeled with ${FACTORY_LABEL}.`;
          } else if (eventAction === 'opened' && issueLabels.includes(FACTORY_LABEL)) {
            eligible = true;
            reason = `Issue opened with ${FACTORY_LABEL} label.`;
          } else {
            reason = `Event does not qualify: action='${eventAction}', label='${labelName}'.`;
          }

          core.setOutput('event_eligible', eligible ? 'true' : 'false');
          core.setOutput('event_eligible_reason', reason);
          if (eligible) core.info(`Eligible: ${reason}`);
          else core.info(`Not eligible: ${reason}`);

    - name: Capture issue context
      id: capture_issue_context
      uses: actions/github-script@v9
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        script: |
          core.setOutput('issue_body', context.payload.issue?.body ?? '');

    - name: Check actor trust
      id: check_actor_trust
      if: steps.qualify_trigger.outputs.event_eligible == 'true'
      uses: actions/github-script@v9
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        script: |
          const sender = context.payload.sender?.login ?? '';
          if (!sender) {
            core.setOutput('actor_trusted', 'false');
            core.setOutput('actor_trusted_reason', 'Sender login missing from event payload.');
            return;
          }
          if (sender === 'github-actions[bot]') {
            core.setOutput('actor_trusted', 'true');
            core.setOutput('actor_trusted_reason', 'github-actions[bot] is trusted.');
            return;
          }
          const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
            owner: context.repo.owner,
            repo: context.repo.repo,
            username: sender,
          });
          const trusted = ['write', 'maintain', 'admin'].includes(data.permission);
          core.setOutput('actor_trusted', trusted ? 'true' : 'false');
          core.setOutput('actor_trusted_reason',
            trusted
              ? `Actor '${sender}' trusted with '${data.permission}' permission.`
              : `Actor '${sender}' not trusted; permission '${data.permission}'.`
          );

    - name: Check duplicate PR
      id: check_duplicate_pr
      if: >-
        steps.qualify_trigger.outputs.event_eligible == 'true' &&
        steps.check_actor_trust.outputs.actor_trusted == 'true'
      uses: actions/github-script@v9
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        script: |
          const { owner, repo } = context.repo;
          const issueNumber = context.payload.issue?.number;
          const expectedBranch = `backlog-groom/issue-${issueNumber}`;

          const pulls = await github.paginate(github.rest.pulls.list, {
            owner, repo, state: 'open',
            head: `${owner}:${expectedBranch}`,
            per_page: 100,
          });

          const duplicate = pulls.find(pr =>
            pr.state === 'open' &&
            pr.head.ref === expectedBranch &&
            pr.labels.some(l => l.name === 'backlog-groom') &&
            /Closes #\d+/.test(pr.body ?? '')
          );

          core.setOutput('duplicate_pr_found', duplicate ? 'true' : 'false');
          core.setOutput('duplicate_pr_url', duplicate?.html_url ?? '');
          if (duplicate) core.info(`Duplicate PR found: ${duplicate.html_url}`);
          else core.info('No duplicate PR found.');

if: >-
  needs.pre_activation.outputs.event_eligible == 'true' &&
  needs.pre_activation.outputs.actor_trusted == 'true' &&
  needs.pre_activation.outputs.duplicate_pr_found != 'true'
steps:
  - uses: actions/setup-node@v4
    with:
      node-version-file: '.node-version'
      cache: yarn
  - name: Bootstrap Kibana
    run: yarn kbn bootstrap
permissions:
  contents: read
  issues: read
  pull-requests: read
jobs:
  pre-activation:
    outputs:
      event_eligible: ${{ steps.qualify_trigger.outputs.event_eligible }}
      event_eligible_reason: ${{ steps.qualify_trigger.outputs.event_eligible_reason }}
      issue_body: ${{ steps.capture_issue_context.outputs.issue_body }}
      actor_trusted: ${{ steps.check_actor_trust.outputs.actor_trusted }}
      actor_trusted_reason: ${{ steps.check_actor_trust.outputs.actor_trusted_reason }}
      duplicate_pr_found: ${{ steps.check_duplicate_pr.outputs.duplicate_pr_found }}
      duplicate_pr_url: ${{ steps.check_duplicate_pr.outputs.duplicate_pr_url }}
# --- ENGINE CONFIGURATION ---
# POC: Uses the default Copilot engine (no secrets needed).
# To switch to Claude via LiteLLM for elastic/kibana, uncomment the block below
# and remove the comment markers.
#
# engine:
#   id: claude
#   model: "llm-gateway/claude-sonnet-4-6"
#   env:
#     ANTHROPIC_BASE_URL: "https://elastic.litellm-prod.ai/"
#     ANTHROPIC_API_KEY: ${{ secrets.CLAUDE_LITELLM_PROXY_API_KEY }}
# --- END ENGINE CONFIGURATION ---
tools:
  github:
    toolsets: [issues, pull_requests, repos]
network:
  allowed: [defaults, node]
  # When switching to LiteLLM, add: elastic.litellm-prod.ai
checkout:
  fetch-depth: 0
safe-outputs:
  create-pull-request:
    labels: [backlog-groom]
    max: 1
  noop:
    max: 1
    report-as-issue: false
---

# Backlog Grooming Agent

You process GitHub issues labeled `backlog-groom` in the Kibana repository. For each issue, you determine whether it is **stale** (should be closed) or **still valid** (should be fixed), and take the appropriate action.

## Pre-activation context

Deterministic pre-activation has confirmed this issue is eligible, the actor is trusted, and there is no existing linked PR.

- **Issue number**: `${{ github.event.issue.number }}`
- **Issue title**: `${{ github.event.issue.title }}`
- **Issue body**:

  ```markdown
  ${{ needs.pre_activation.outputs.issue_body }}
  ```

- **Repository**: `${{ github.repository }}`
- **Triggered by**: `@${{ github.actor }}`
- **Required branch**: `backlog-groom/issue-${{ github.event.issue.number }}`

## Phase 1: Staleness analysis

Before attempting any implementation, determine whether the issue is still valid:

1. **Read the issue** carefully — understand what bug or feature is described.
2. **Search the codebase** for the files, functions, or components mentioned in the issue.
3. **Check git history** — use `git log` on the relevant files to see if the problem has already been fixed or if the code has been significantly refactored since the issue was filed.
4. **Check for duplicates** — search open/closed issues for similar titles or descriptions.

### If the issue is stale

An issue is stale if any of these are true:
- The code referenced in the issue no longer exists or has been substantially rewritten
- A recent commit or merged PR already addresses the described problem
- The feature or behavior described has been intentionally removed or replaced
- The issue references a version or configuration that is no longer supported

If stale, use `noop` with a detailed explanation including:
- What evidence you found (commit SHAs, PR numbers, file changes)
- A recommended action (close as fixed, close as outdated, close as duplicate with link)
- A comment on the issue explaining your findings

### If the issue is still valid

Proceed to Phase 2.

## Phase 2: Implementation

Follow the Kibana contribution guidelines:

1. **Identify the root cause** — read the relevant code thoroughly. Do not guess.
2. **Create or update your implementation** on branch `backlog-groom/issue-${{ github.event.issue.number }}`.
3. **Follow Kibana code style**:
   - TypeScript for all new code; no `any` or `unknown`
   - `import type` for type-only imports
   - `camelCase` for functions/variables, `PascalCase` for types/components
   - `snake_case` for new filenames
   - Single quotes in TS/JS
   - Prefer early returns and explicit error handling
   - Use `@elastic/eui` components with Emotion for UI
4. **Validate your changes**:
   - Run `node scripts/eslint --fix` on changed files
   - Run `node scripts/jest <test-file>` for relevant unit tests
   - Run `node scripts/type_check --project <tsconfig>` scoped to the affected package
5. **Open exactly one PR** using the `create-pull-request` safe output.

## Pull request contract

The linked pull request must:
- Use branch `backlog-groom/issue-${{ github.event.issue.number }}`
- Include `Closes #${{ github.event.issue.number }}` in the PR body
- Be labeled `backlog-groom`
- Be opened as a **draft**
- Include a summary of what was changed and why
- Stay focused on the triggering issue only

## Guardrails

- Do not re-check trigger eligibility or actor trust; pre-activation handled those.
- Do not open a second PR for the same issue.
- Do not change the branch naming convention.
- Do not modify unrelated files or do broad refactors.
- Never suppress lint errors with `eslint-disable` or type errors with `@ts-ignore`.
- Never remove, skip, or comment out tests to make them pass.
- If you cannot make progress safely, use `noop` with a concise explanation.
- If the issue is ambiguous or requires design decisions, use `noop` explaining what clarification is needed.
