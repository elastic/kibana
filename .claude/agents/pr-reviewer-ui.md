---
name: pr-reviewer-ui
description: Reviews changed Kibana user-facing UI code for accessibility, loading, empty-state, and error-handling gaps. Dispatched by the review orchestrator when public UI files change.
globs: ["**/public/**", "**/*.tsx", "**/*.scss"]
tools: Read, Grep, Glob
---

# UI PR Reviewer

Review the changed user-facing UI files. Prioritize:

- user-facing UI changes with clear accessibility, loading, empty-state, or error-handling gaps

Follow `.claude/skills/pr-review-core/SKILL.md` for the shared methodology, scope guardrails, do-not-report list, and the finding output contract.
