---
name: gh-create-issue
description: Create a new GitHub issue (feature request or bug report) by gathering an unstructured description from the user, classifying it, filling out the appropriate template, interviewing the user to improve any weak sections, writing a draft metadata file for review, and filing the issue via the GitHub CLI after explicit confirmation.
disable-model-invocation: true
---

# Create GitHub Issue

Guide the user through creating a well-structured GitHub issue from scratch.

## Defaults

- Create issues in `elastic/security-team` unless the user explicitly requests a different repository.
- Add created issues to Elastic org project `@contextual-security-project` (`https://github.com/orgs/elastic/projects/705`, project number `705`).
- Validate labels against the target repository, not against `elastic/kibana` unless `elastic/kibana` is the target repository.
- If a `Team:One Workflow` label exists in the target repository, use it as the default team label for One Workflow issues. If it does not exist, do not invent it.
- Before creating an issue, always write the final draft metadata to a temporary file and ask the user to confirm that exact draft.

## Step 1 — Gather the unstructured description

Ask the user to describe their feature request or bug report in their own words — no structure required. Tell them to include as much or as little as they know. **End your response and wait for the user to reply before proceeding.**

Example prompt to the user:
> Describe the feature you'd like or the bug you've found in your own words. Don't worry about structure — just tell me what you're thinking and I'll help shape it.

## Step 2 — Classify the issue

Using the user's description, determine whether this is a **bug report** or a **feature request**:

- Language like "broken", "crash", "error", "fails", "not working", "regression", "unexpected behavior", "should have worked" → **bug report**.
- Language like "add support for", "allow", "should be able to", "would be nice", "request", "proposal", "improve", "I wish", "it would be helpful if" → **feature request**.

If classification is ambiguous, ask the user which type applies before continuing.

## Step 3 — Read the appropriate template

Read the template to know which fields to populate:

- **Bug report**: read `.github/ISSUE_TEMPLATE/Bug_report.md`
- **Feature request**: read `.github/ISSUE_TEMPLATE/Feature_request.yml`

If the target repository does not contain equivalent templates, use the Kibana templates above as the issue body structure while still creating the issue in the target repository.

## Step 4 — Draft the issue from the description

Using the user's description as source material, populate as many template fields as you can. Apply reasonable inference:

- For **feature requests**: synthesize a clear "What feature do you want added?" statement (noting what's explicitly out of scope if apparent), derive a "Why?" from the use-case (including how users work around the gap today and who the target user is), draft initial Acceptance Criteria (happy path + edge cases) from the described behavior, infer a priority if clues are present, and note any blocking issues for the "Blocked By" field.
- For **bug reports**: extract steps to reproduce, expected vs actual behavior, and any environment details mentioned.

Leave fields blank where the description provides no basis for inference. Do **not** ask questions yet — draft first.

## Step 5 — Generate a title

Draft a concise, descriptive issue title (under 72 characters) that captures the core ask or bug. Prefix with the relevant area if apparent (e.g. `[Discover]`, `[Maps]`, `[Alerting]`).

## Step 6 — Interview the user for weak or missing fields

Review your draft. Identify fields that are:
- Empty, or
- Vague / not independently verifiable (for Acceptance Criteria), or
- Missing required information

For each such field, ask **one question at a time**, then **end your response and wait for the user to reply** before moving to the next field.

Guidelines:
- For required fields (`Describe the bug`, `Steps to reproduce`, `Expected behavior`, `What feature do you want added?`, `Why?`): always ask if missing or weak.
- For Acceptance Criteria: if the drafted criteria are vague (e.g. "should work correctly"), ask the user to make them concrete and testable.
- For optional fields (`screenshots`, `logs`, `browser console errors`, `additional context`, `Priority`): ask once; accept "N/A" or "none" and move on.
- If an answer is still vague after one follow-up, ask one more targeted clarifying question, then move on.
- Once all fields are addressed, proceed to Step 7.

For **feature requests**, also probe for these common gaps (even if the field is not empty, ensure the draft addresses them):
- **Scope boundaries**: Is it clear what's *not* included? If the feature could be interpreted broadly, ask what's explicitly out of scope.
- **Current workaround**: How do users accomplish this today? If the "Why?" doesn't describe the workaround, ask.
- **Target user**: Who would use this — what role or persona? If not stated, ask.
- **Dependencies**: Are there issues, features, or infrastructure changes that must land first? If so, capture them in the "Blocked By" field.

## Step 7 — Collect and validate labels

Ask the user for a **team label** (e.g. `Team:Visualizations`) and any **additional labels** (e.g. `accessibility`, `performance`). Accept "none" for either. The type label (`bug` or `enhancement`) is added automatically.

For One Workflow issues, prefer `Team:One Workflow` only if it exists in the target repository.

**End your response and wait for the user to reply before proceeding.**

Once the user provides labels, validate **all of them in parallel** against the repository:

```bash
gh label list --repo "<TARGET_REPO>" --search "<label>" --limit 10 --json name,description --jq '.[] | "- `\(.name)` — \(.description // "no description")"'
```

For each label:

- **Exact match** → keep it.
- **Close matches only** → show them as `` `<name>` — <description> `` and ask the user to pick one or skip.
- **No matches** → inform the user and ask to skip or provide an alternative.

If any labels need user input, **wait for the reply**, then re-validate any new labels. Repeat until all labels are resolved.

## Step 8 — Write draft metadata file, show the draft, and confirm

Before asking for confirmation, write the full issue draft metadata to a temporary JSON file. Prefer:

```bash
mkdir -p .cursor/tmp
```

Use a filename like `.cursor/tmp/gh_issue_draft_<slug_or_timestamp>.json`.

The draft file must include all data needed to create the issue:

```json
{
  "repo": "<TARGET_REPO>",
  "title": "<TITLE>",
  "labels": ["<label1>", "<label2>"],
  "typeLabel": "bug|enhancement",
  "project": {
    "owner": "elastic",
    "number": 705,
    "title": "@contextual-security-project",
    "url": "https://github.com/orgs/elastic/projects/705"
  },
  "body": "<formatted issue body>",
  "sourceContext": {
    "relatedLinks": []
  }
}
```

Display the complete issue preview using this format:

> **Title:** `<title>`
> **Repository:** `<TARGET_REPO>`
> **Labels:** `<label1>`, `<label2>`, ...
> **Project:** `@contextual-security-project` (`https://github.com/orgs/elastic/projects/705`)
> **Draft file:** `<path-to-draft-json>`
>
> ---
> \<issue body\>
> ---

Ask the user to confirm or request changes. If the user requests changes, update the draft metadata file and show the preview again.

**End your response and wait for explicit confirmation before filing.**

## Step 9 — Create the issue

After explicit confirmation, read the draft metadata file and create the issue from that exact data.

```bash
gh issue create --repo "<TARGET_REPO>" \
  --title "<TITLE>" \
  --label "<label1>" --label "<label2>" --label "<labelN>" \
  --body "$(cat <<'EOF'
<formatted body here>
EOF
)"
```

Add one `--label` flag per label.

Always include the type label (`bug` or `enhancement`) plus all validated labels.

## Step 10 — Add the issue to the project

After the issue is created, add the created issue URL to the contextual security project:

```bash
gh project item-add 705 --owner elastic --url "<ISSUE_URL>"
```

Report the new issue URL, project URL, and draft metadata file path to the user when done.
