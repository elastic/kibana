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

## Step 7 — Show the draft and confirm

Display the complete proposed issue (title + body) and ask the user to confirm or request changes. **End your response and wait for explicit confirmation before filing.**

## Step 8 — Create the issue

After the user confirms, create the issue:

```bash
ISSUE_BODY=$(cat <<'EOF'
<formatted body here>
EOF
)
gh issue create --repo elastic/kibana --title "<TITLE>" --body "$ISSUE_BODY" --label "<bug|enhancement>"
```

Use label `bug` for bug reports and `enhancement` for feature requests.

Report the new issue URL to the user when done.
