---
name: create-pr
description: Create a draft GitHub PR for the current branch using the Kibana PR template, or update the description of an existing open PR. Invoked with /create-pr.
---

# Create or Update Pull Request

## Step 1 — Gather branch context

Run these commands to understand what's on the branch:

```bash
# Current branch
git branch --show-current

# Check for an existing open PR on this branch
gh pr list --head "$(git branch --show-current)" --state open --json number,title,url,body

# Fetch upstream main so comparisons are accurate regardless of local local main state
git fetch origin main --quiet

# Commits ahead of upstream main
git log origin/main..HEAD --oneline

# Files changed relative to upstream main
git diff origin/main...HEAD --stat

# PR template (source of truth for the description structure)
cat .github/PULL_REQUEST_TEMPLATE.md

# Available backport labels
gh label list --repo elastic/kibana --json name --jq '[.[] | select(.name | startswith("backport:"))] | .[].name'
```

## Step 2 — Decide: create or update

**If an open PR already exists:**

Show the user the existing PR number and title, explain you'll update its description, and ask for confirmation before proceeding. **Wait for the user to confirm before continuing.**

**If no open PR exists:**

Proceed directly to Step 3.

## Step 3 — Generate the PR title

Kibana PR titles follow the convention: `[Area] Sentence case title`.

- **Area prefix**: a short label in square brackets identifying the product area or team. Common examples: `[Security Solution]`, `[Alerting]`, `[Discover]`, `[ML]`, `[Fleet]`, `[Platform]`, `[CI]`. Infer the correct prefix from the files changed and the plugin/package being modified.
- **Title**: sentence case (only first word and proper nouns capitalised), written as a noun phrase or imperative. Under 72 characters total including the prefix.

Example: `[Security Solution] Remove threat hunting agent built-in registration`

Derive the title from the branch name and commit messages.

## Step 4 — Run branch readiness checks

Before analysing the changes, invoke the `branch-readiness-checks` skill to validate lint, types, and tests. Wait for it to complete and note any failures — include a summary of results in the PR description if anything needs attention.

## Step 5 — Analyse the changes

Before drafting, reason carefully about the following. Do not output this analysis — use it to inform the template fields below.

### 5a — Checklist evaluation

Use the checklist items from `.github/PULL_REQUEST_TEMPLATE.md` (fetched in Step 1) as the authoritative list. Go through each item and decide: checked (`[x]`) or unchecked (`[ ]`).

- **EUI writing / i18n**: Check `[x]` only if the PR adds user-visible text (UI labels, messages, descriptions). If it's purely a code/logic change with no new strings, leave unchecked.
- **Documentation**: Check `[x]` if the PR adds, changes, or removes a user-facing feature that requires explanation or tutorials.
- **Unit or functional tests**: Check `[x]` if tests were added or updated as part of this PR. Leave unchecked if no test changes were made.
- **Plugin config key**: Check `[x]` only if a plugin configuration key was added or changed.
- **Breaking HTTP API changes**: Check `[x]` if any public HTTP API route was added, removed, or changed in a breaking way.
- **Flaky Test Runner**: Always leave unchecked (`[ ]`). This runner is for e2e tests only and is triggered manually by the developer at https://ci-stats.kibana.dev/trigger_flaky_test_runner/1 — never fill this in.
- **Release notes label**: Always check `[x]` — every PR needs the appropriate `release_note:*` label applied.
- **Backport labels**: Always leave unchecked (`[ ]`) — the developer selects backport labels from the list presented in Step 6.

### 5b — Risk evaluation

Reason about each of the following risk categories and produce a concise written assessment for the **Identify risks** section:

- **Data loss or corruption**: Does the change remove, migrate, or transform persisted data (saved objects, ES indices, cookies, local storage)? Could users lose access to previously created content?
- **Broken user workflows**: Does the change remove a feature, rename an identifier, or change behaviour that users depend on? Are existing sessions, conversations, or URLs affected?
- **Regressions**: Could the change break currently working functionality, even indirectly?
- **Performance**: Could the change add latency, increase memory usage, or affect scalability?
- **Hard-to-test scenarios**: Are there edge cases that automated tests don't cover and that could silently fail in production?

For each risk found: state the risk, its severity (low / medium / high), and the mitigation or decision made. If no significant risks exist, state that explicitly.

### 5c — Release note

Draft a single-sentence release note suitable for the Kibana changelog. It should describe the user-facing impact in plain English — what changed from a user's perspective, not what code changed. Examples:

- "Removes the Threat Hunting Agent from the Agent Builder; security workflows now use the Elastic AI Agent with skills."
- "Fixes an issue where the rule creation menu would show an error when the AI agent was unavailable."

If the change is purely internal with no user-facing impact, write: "No user-facing changes."

Include the appropriate `release_note:*` label recommendation:
- `release_note:breaking` — breaking change
- `release_note:deprecation` — deprecating a feature
- `release_note:feature` — new feature
- `release_note:enhancement` — improvement to existing feature
- `release_note:fix` — bug fix
- `release_note:skip` — no user-facing change

## Step 6 — Draft the PR description

Using your analysis from Step 5 and the template structure from `.github/PULL_REQUEST_TEMPLATE.md` (fetched in Step 1), fill in each section of the template. Be specific in the Summary — describe *what* changed and *why*, not just that files were changed.

Apply the checklist evaluations from Step 5a to each item: checked (`[x]`) or unchecked (`[ ]`).

For the **Identify risks** section, replace the placeholder with the risk assessment from Step 5b.

Add a **Release note** section at the end (not in the original template):

```
### Release note

> <release note sentence from Step 5c>

**Suggested label:** `<release_note:* label>`
```

## Step 7 — Show the draft and confirm

Display the generated title and full description to the user.

Also show the available `backport:*` labels fetched in Step 1 and ask the user which ones apply (if any). **Wait for explicit confirmation — and backport label selection — before filing.**

## Step 8 — Create or update the PR

**Creating a new PR:**

```bash
gh pr create \
  --draft \
  --title "<TITLE>" \
  --body "$(cat <<'EOF'
<BODY>
EOF
)"
```

**Updating an existing PR:**

```bash
gh pr edit <NUMBER> --body "$(cat <<'EOF'
<BODY>
EOF
)"
```

Remind the user to add the chosen `backport:*` labels and `release_note:*` label in the GitHub UI, then report the PR URL.
