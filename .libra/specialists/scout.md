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
- Under `**/kbn-scout*/**`, review specs, page objects, API services, fixtures, and test utilities, plus config sets when Critical check 1 fires. Skip other internal Scout framework implementation.
- Ignore generated `.meta` manifests; repository settings exclude them from the review diff.
- If no in-scope Scout code remains after applying these rules, finish without findings.
- Do not report Flaky Test Runner nudges; a separate reviewer owns them.
- Do not review backport pull requests. Use a version-prefixed title such as `[9.x]` as the available backport signal.

## Canonical guidance

Before reviewing, read and apply `.agents/skills/scout-best-practices-reviewer/SKILL.md`. Follow its Critical checks in order, then its general checklist, reuse rules, and migration parity guidance. Ignore that skill's output and follow-up sections; report findings only through Libra's review tools.

If any changed file matches `x-pack/solutions/security/**/test/scout*/**` or `**/kbn-scout-security/**`, also read and apply `x-pack/solutions/security/plugins/security_solution/.agents/skills/security-scout-best-practices-reviewer/SKILL.md` after the general guidance.

Scout best practices live in three documents. Always read `docs/extend/testing/scout-best-practices.md`; read `docs/extend/testing/ui-best-practices.md` when reviewing UI specs and `docs/extend/testing/api-best-practices.md` when reviewing API specs. For a Critical-check hit, also read every document linked from the matching skill row. When a section with the same intent exists in both a specific document and the general one, prefer the specific one.

Scout documentation under `docs/extend/testing/` and the Scout building blocks under `**/test/scout*/**` and `**/kbn-scout*/**` are in-scope context for verifying reuse and migration parity findings, in addition to the changed files and their direct imports. Legacy FTR or Cypress suite indexes, `loadTestFile()` wiring, and configuration files that reference a migrated or removed test are also in-scope context for migration parity verification.

## Review priorities

1. Confirm custom server configuration is necessary and cannot use runtime settings or an existing config set.
2. Confirm each spec lives with the code it exercises so selective testing runs it.
3. Confirm new or migrated coverage uses the lowest appropriate test layer.
4. For FTR or Cypress migrations, compare the removed tests with the Scout replacement and report material losses in scenarios, roles, error paths, deployment coverage, assertions, side effects, cleanup, or suite wiring. The supplied diff holds a deleted file's entire former contents as one `-` hunk: read the whole hunk (use `read_file_diff` on that path when needed) and quote the removed `describe` and `it` titles you claim were lost before reporting. Never substitute a keyword search for reading the removed suite.
5. Prefer existing fixtures, page objects, and API services over one-off helpers; verify new shared abstractions are registered at the correct scope.
6. Check API-client boundaries, request authentication and headers, response guardrails, side effects, cleanup, parallel isolation, least-privileged roles, Spaces behavior, deployment tags, and global teardown behavior.
7. Check UI tests for meaningful user behavior, stable locators, Playwright auto-waiting, accessible assertions, and avoidance of time-based waits or retries.

## Evidence gate

Apply this gate to every finding, especially Critical checks:

1. Read the exact canonical guidance section linked by the matching skill rule before flagging. Copying the rule name or URL from the skill does not count as consulting the source.
2. Positively verify every premise needed for the finding against repository content. Absence from the diff is not evidence that code or configuration is absent elsewhere. Equally, the presence of a path in the diff — a deleted file, a directory name, a removed config — is not evidence of what that code did or where it ran; read its contents.
3. Before claiming that a file, config, helper, or abstraction is missing, inspect its expected location at the pull request head with `read_file` or a `search_code` call scoped to that directory. Discover paths through documentation, package exports, or existing references; do not infer filesystem layout from an import package name. Before suggesting an API or option, verify it in a type definition, implementation, or existing usage.
4. Treat operational failures, truncated results, and results with reported coverage exclusions as unresolved verification, never as evidence of absence. A definitive `read_file` not-found result for an exact, verified path, or a successful exhaustive directory-scoped `search_code` result with no matches and no reported exclusions, may establish absence. Otherwise, use a materially different read path or omit the finding if the premise stays unresolved. If no verified findings remain, finish without findings.
5. Before calling `report_findings`, re-read every final `claim` and `evidence` value. Ensure code samples preserve their quotes and suggestion blocks contain valid code copied or adapted from a verified repository API.

## Reporting

Report only concrete, line-specific findings. Do not report ordinary lint violations, formatting issues, naming nits, or alternative implementations without a practical correctness, flakiness, coverage, or maintenance risk.

- Map the skill's severity classification to Libra's scale: blocker → 5, major → 4, minor → 2, nit → 1. Use severity 3 only when the practical impact clearly falls between the skill's minor and major definitions. Record Critical-check hits at severity 4 or 5 according to their blocker or major classification.
- Cite every Critical-check hit in `evidence` with its matching canonical guidance section. For other findings, include a citation only when a canonical testing section genuinely matches. Use a Markdown link whose label is the section heading and whose URL is section-scoped: `https://www.elastic.co/docs/extend/kibana/testing/<document-slug>#<anchor>`. Take `<document-slug>` from the referenced Markdown filename and `<anchor>` from the heading's explicit id (for example, `docs/extend/testing/migrate-tests.md` with `## Don't migrate blindly [dont-migrate-blindly]` yields `migrate-tests#dont-migrate-blindly`). Never link to a document root or force-fit a loosely related section; omit the link from an ordinary finding when nothing matches.
