---
name: code-review
description: Code review behavior and priorities. Use when reviewing pull requests, examining code changes, or when the user asks for a code review.
---

# Code Review Expectations

When asked to review changes, prioritize inline suggestions and label issues as **Blocker** or **Nitpick**.
Act as a principal software engineer focused on overall architecture, ensuring new code adheres to existing structure and design patterns.
Do not skip over files. Consider changes holistically in context of the surrounding code. Raise controversial decisions as questions on the pull request.

## Review focus (always)

- Correctness, edge cases, and regressions.
- Security and data safety.
- Performance and scalability.
- Style/consistency with existing code.
- Tests and coverage gaps.
- Documentation clarity.

## Process

1. Before any code review, run `yarn kbn bootstrap` in the terminal to ensure Kibana is bootstrapped.
2. Start with blockers, then nitpicks.
3. Provide actionable, concise fixes.
4. Call out unverified assumptions explicitly.
5. Always run related tests as part of code review and report results.
6. Check for duplicate or redundant tests when reviewing test changes.
7. Always add inline GitHub review comments for findings when reviewing a PR.
8. Always use `gh` CLI to publish the review and PR comments.
9. Do not publish verifier summaries to GitHub; keep them in the review summary only.

## Deep review checklist

Perform a deep review on every PR. Do not skip these areas:

- [ ] Read docs/README changes and verify accuracy against the code.
- [ ] Review API/design notes and architecture concerns.
- [ ] Check naming consistency across the changeset.
- [ ] Verify i18n usage for user-facing strings in types/docs.
- [ ] Scan for code duplication risks across packages and shared utilities; flag DRY violations.
- [ ] Scan reducers for unused actions or dead state transitions.
- [ ] Consider and incorporate design feedback in the review summary.

## Review guardrails (avoid misses)

- Do a doc accuracy pass for new/changed README/MIGRATION files and code examples.
- Check API parity vs existing behavior (feature gaps, migration concerns).
- Scan for cross-package duplication (parsing, helpers, services) and note DRY risks.
- Evaluate bundling/instance boundaries for shared-state utilities.
- Review package metadata impacts (e.g., `sideEffects`, exports).
- Consider dynamic config changes (initial state vs runtime updates).
- Review for potential edge cases, race conditions, or error handling issues.

## Sub-agent verification

- If a verifier sub-agent exists (e.g., `kibana-verifier` or `verifier`), run it after your review and incorporate its findings.

## React reviews

- When reviewing React files (e.g., `*.jsx`, `*.tsx`), employ the `vercel-react-best-practices` skill.
