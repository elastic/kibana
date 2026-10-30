# PR body template for papercut PRs

Keep it short. A reviewer should be able to decide from the screenshots and the first paragraph. Keep the repository's own PR template sections (`## Checklist`, `## Identify risks`) below this content and fill them in honestly.

Replace the image references with the local file names. `gh pr create --attach` rewrites them to hosted URLs.

````markdown
## Summary

<One or two sentences: what looks wrong, where, and under what condition (viewport, data, state).>

<One or two sentences: what the PR changes to fix it.>

Before (<viewport or state>):

![Before: <what is wrong>](./before-<area>-<width>.png)

After:

![After: <what it looks like now>](./after-<area>-<width>.png)

**Design change:** <yes or no>. <If yes: say exactly what changes visually, for example "the vertical dividers between metrics are removed and the spacing goes from 32px to 24px". Reviewers from design should look at this PR.>

## Testing

- <Exact commands that were run and their result: scoped Jest, eslint, type check.>
- <How the screenshots were produced and what was measured, for example "wrapped metric started at x=314, the first at x=289; after the change both start at x=289".>
- <What was not tested and why, for example "no Jest test added because jsdom cannot measure layout".>

## Checklist

<Repository template checklist, with a short reason on each unchecked item.>

## Identify risks

<Risk, severity, mitigation. For a visual fix: "Visual change. Severity: low. Mitigation: the screenshots above.">
````

Notes:

- Suggest labels in the body (`release_note:skip`, no backport) instead of applying them.
- If **Design change** is yes, say so in the first line of your reply to the user so they can tag the right people.
- Do not mention the agent or the tooling used in the body. Describe the change and the evidence.
