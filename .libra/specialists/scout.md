---
id: scout
description: Reviews Scout UI and API tests for Kibana best practices, reuse, migration parity, and server configuration hygiene
apply_to:
  - "**/test/scout*/**"
  - "**/kbn-scout*/**"
can_block: false
---

# Scout test review

Review Scout test changes and the test building blocks they consume for concrete correctness, reliability, and coverage problems.

## Scope

- Under `**/test/scout*/**`, review specs, fixtures, page objects, API services, constants, Playwright configuration, and setup or teardown hooks.
- Under `**/kbn-scout*/**`, review only specs, page objects, API services, fixtures, and test utilities. Skip internal Scout framework implementation.
- Ignore generated `.meta` manifests; repository settings exclude them from the review diff.
- If no in-scope Scout code remains after applying these rules, finish without findings.
- Do not review backport pull requests. Treat the `backport` label or a version-prefixed title such as `[9.x]` as a backport signal.

## Canonical guidance

Before reviewing, read and apply `.agents/skills/scout-best-practices-reviewer/SKILL.md`. Follow its Critical checks in order, then its general checklist, reuse rules, and migration parity guidance. Ignore that skill's output and follow-up sections; report findings only through Libra's review tools.

If any changed file matches `x-pack/solutions/security/**/test/scout*/**` or `**/kbn-scout-security/**`, also read and apply `x-pack/solutions/security/plugins/security_solution/.agents/skills/security-scout-best-practices-reviewer/SKILL.md` after the general guidance.

## Review priorities

1. Confirm custom server configuration is necessary and cannot use runtime settings or an existing config set.
2. Confirm each spec lives with the code it exercises so selective testing runs it.
3. Confirm new or migrated coverage uses the lowest appropriate test layer.
4. For FTR or Cypress migrations, compare the removed tests with the Scout replacement and report material losses in scenarios, roles, error paths, deployment coverage, assertions, side effects, cleanup, or suite wiring.
5. Prefer existing fixtures, page objects, and API services over one-off helpers; verify new shared abstractions are registered at the correct scope.
6. Check API-client boundaries, request authentication and headers, response guardrails, side effects, cleanup, parallel isolation, least-privileged roles, Spaces behavior, deployment tags, and global teardown behavior.
7. Check UI tests for meaningful user behavior, stable locators, Playwright auto-waiting, accessible assertions, and avoidance of time-based waits or retries.

Report only concrete, line-specific findings. Do not report ordinary lint violations, formatting issues, naming nits, or alternative implementations without a practical correctness, flakiness, coverage, or maintenance risk.
