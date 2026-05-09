---
name: gh-enhance-issue
description: Fetch a GitHub issue by number or URL and reformat it according to the Kibana bug report or feature request template. Classifies the issue type automatically, then rewrites the body and updates it via the GitHub CLI.
disable-model-invocation: true
---

# Enhance GitHub Issue

Fetch a GitHub issue and reformat its body to match the appropriate Kibana issue template.

## Input

The user provides either:
- An issue number (e.g. `12345`)
- A GitHub issue URL (e.g. `https://github.com/elastic/kibana/issues/12345`)

Extract the issue number from whichever form was provided.

## Step 1 — Fetch the issue

```bash
gh issue view <NUMBER> --repo elastic/kibana --json number,title,body,labels
```

Read the `title`, `body`, and `labels` fields from the output.

## Step 2 — Classify the issue

Determine whether the issue is a **bug report** or a **feature request**:

1. Check the `labels` array first. If any label contains `bug` (case-insensitive), treat it as a bug. If any label contains `enhancement` or `feature` (case-insensitive), treat it as a feature request.
2. If labels are ambiguous or absent, infer from the `title` and `body`:
   - Language like "broken", "crash", "error", "fails", "not working", "regression", "unexpected behavior" → bug.
   - Language like "add support for", "allow", "should be able to", "would be nice", "request", "proposal", "improve" → feature request.
3. If classification is still uncertain, ask the user before proceeding.

## Step 3 — Extract what you can from the existing body

Using the original `title` and `body` as source material, map existing content to the appropriate template fields. For feature requests, look for scope boundaries, current workarounds, target user, and any mentioned blockers or dependencies. Leave fields blank where no information is available in the original issue.

*** Bug report *** Read `.github/ISSUE_TEMPLATE/Bug_report.md` to get the required fields.

*** Feature request *** Read `.github/ISSUE_TEMPLATE/Feature_request.yml` to get the required fields.

## Step 4 — Interview the user for empty fields

After extracting what you can, identify which fields are still empty. Ask the first empty field's question, then **end your response and wait for the user to reply**. Do not ask the next question or proceed to Step 5 until the user has answered.

Guidelines:
- For required fields (e.g. "Describe the bug", "Steps to reproduce", "What feature do you want added?", "Why?"): always ask.
- For optional fields (e.g. screenshots, browser console errors, logs, additional context): ask once and accept "N/A" or "none" as a valid answer; do not press further.
- If the user's answer is vague, ask one targeted follow-up question to clarify, then **end your response and wait** before moving on.
- Once all empty fields have been addressed, proceed to Step 5.

For **feature requests**, also probe for these common gaps (even if the field is not empty, ensure the draft addresses them):
- **Scope boundaries**: Is it clear what's *not* included? If the feature could be interpreted broadly, ask what's explicitly out of scope.
- **Current workaround**: How do users accomplish this today? If the "Why?" doesn't describe the workaround, ask.
- **Target user**: Who would use this — what role or persona? If not stated, ask.
- **Dependencies**: Are there issues, features, or infrastructure changes that must land first? If so, capture them in the "Blocked By" field.

## Step 5 — Show the diff and confirm

Display the proposed new body to the user and ask for confirmation before making any changes. **End your response and wait for the user to explicitly confirm before proceeding to Step 6.**

## Step 6 — Update the issue

After the user confirms, update the issue body:

```bash
gh issue edit <NUMBER> --repo elastic/kibana --body "<NEW_BODY>"
```

Pass the body via a shell variable or heredoc to avoid quoting issues:

```bash
NEW_BODY=$(cat <<'EOF'
<reformatted body here>
EOF
)
gh issue edit <NUMBER> --repo elastic/kibana --body "$NEW_BODY"
```

Confirm success by reporting the issue URL.
