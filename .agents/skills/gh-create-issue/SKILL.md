---
name: gh-create-issue
description: Create a new GitHub issue (feature request or bug report) by gathering an unstructured description from the user, classifying it, filling out the appropriate Kibana template, interviewing the user to improve any weak sections, and filing the issue via the GitHub CLI.
disable-model-invocation: true
---

# Create GitHub Issue

Guide the user through creating a well-structured GitHub issue from scratch.

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

### 7a — Ask about labels

Ask the user:
1. **Team label**: Does a team own this area? If so, which team label should be applied (e.g. `Team:Visualizations`, `Team:Security`)? Accept "none" or "not sure".
2. **Additional labels**: Are there any other labels they'd like to add (e.g. `accessibility`, `performance`, `tech-debt`)? Accept "none".

The type label (`bug` or `enhancement`) is always added automatically based on the classification in Step 2.

**End your response and wait for the user to reply before proceeding.**

### 7b — Validate every user-provided label

For each label the user provided, verify it exists in the repository:

```bash
gh label list --repo elastic/kibana --search "<label>" --limit 10 --json name --jq '.[].name'
```

Apply this logic per label:

- **Exact match found** → keep it.
- **No exact match but close matches returned** → show the user the closest matches and ask them to pick one or skip. **Wait for the user to reply.**
- **No matches at all** → inform the user the label doesn't exist and ask whether to skip it or provide an alternative. **Wait for the user to reply.**

Repeat until all labels are resolved. Build the final label list: the type label (`bug` or `enhancement`) plus all validated labels.

## Step 8 — Show the draft and confirm

Display the complete proposed issue in this format:

> **Title:** `<title>`
> **Labels:** `<label1>`, `<label2>`, ...
>
> ---
> \<issue body\>
> ---

Ask the user to confirm or request changes. Explicitly mention they can also add, remove, or change labels at this point. If they request new labels, loop back to Step 7b to validate them before continuing.

**End your response and wait for explicit confirmation before filing.**

## Step 9 — Create the issue

After the user confirms, create the issue:

```bash
LABEL_ARGS=""
for label in "<label1>" "<label2>" "..."; do
  LABEL_ARGS="$LABEL_ARGS --label \"$label\""
done

ISSUE_BODY=$(cat <<'EOF'
<formatted body here>
EOF
)
gh issue create --repo elastic/kibana --title "<TITLE>" --body "$ISSUE_BODY" $LABEL_ARGS
```

Always include the type label (`bug` for bug reports, `enhancement` for feature requests) plus any validated team and additional labels.

Report the new issue URL to the user when done.
