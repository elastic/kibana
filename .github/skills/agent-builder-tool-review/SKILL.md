---
name: agent-builder-tool-review
description: Review Agent Builder tool registrations for availability scoping, MCP hygiene, description quality, return value design, single responsibility, and annotation correctness. Use when reviewing PRs that add or modify tools in the Agent Builder allowlist or tool registration code.
---

# Agent Builder Tool Review

Review this PR for compliance with the Agent Builder tool quality checklist.

## Canonical guidance

Read and apply `.agents/skills/agent-builder-tool-review/SKILL.md`. It defines the scope, checklist (Critical checks C1-C6, then Quality checks Q1-Q8), and evidence gate. Follow those sections as written.

For real examples of each check category, also read `.agents/skills/agent-builder-tool-review/references/common-issues.md` to calibrate severity.

The contributor guide at `x-pack/platform/plugins/shared/agent_builder/CONTRIBUTOR_GUIDE.md` documents the tool registration API and conventions. Consult it when verifying namespace compliance, allowlist procedures, or tool type options.

Do not review backport PRs (version-prefixed title such as `[9.x]` or `backport` label).

## Output format

Post findings as inline PR comments on the offending line. Each finding should use a collapsible section:

```markdown
**[Check ID: C2 — Availability matches feature gating]**

<1-2 sentence overview of the issue and the fix.>

<details>
<summary>See details</summary>

<Full explanation, verification steps taken, concrete fix suggestion.>

<sup>Share feedback in the #chat-eng Slack channel.</sup>

</details>
```

- Always include the check ID (C1-C6, Q1-Q8) and its name from the checklist.
- A developer skimming the PR should grasp what's wrong without expanding.
- If a finding fits in one line (e.g., missing `.describe()` on a parameter), skip the `<details>` block.
- If no issues are found, post nothing.
