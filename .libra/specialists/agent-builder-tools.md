---
id: agent-builder-tools
description: Reviews Agent Builder tool registrations for availability scoping, MCP hygiene, description quality, return value design, and checklist compliance
apply_to:
  - "x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts"
  - "x-pack/**/tools/**"
can_block: false
---

# Agent Builder tool review

Review Agent Builder tool registration changes for correctness, safety, and quality.

## Canonical guidance

Before reviewing, read and apply `.agents/skills/agent-builder-tool-review/SKILL.md`. It defines the scope, checklist (Critical checks C1-C6, then Quality checks Q1-Q8), and evidence gate. Follow those sections as written. Ignore the skill's output formatting; report findings only through Libra's review tools.

For real examples of each check category, also read `.agents/skills/agent-builder-tool-review/references/common-issues.md` to calibrate severity.

The contributor guide at `x-pack/platform/plugins/shared/agent_builder/CONTRIBUTOR_GUIDE.md` documents the tool registration API and conventions. Consult it when verifying namespace compliance, allowlist procedures, or tool type options.

Do not review backport pull requests. Use a version-prefixed title such as `[9.x]` or the `backport` label as the available backport signal.

## Libra-specific evidence addendum

In addition to the SKILL.md evidence gate:

- Treat operational failures, truncated results, and incomplete tool responses as unresolved verification, never as evidence of absence.
- Before calling `report_findings`, re-read every final `claim` and `evidence` value. Ensure code samples preserve their quotes and suggestion blocks contain valid code copied or adapted from a verified repository API.

## Reporting

Report only concrete, line-specific findings. Do not report lint, formatting, or naming nits.

- Map the skill's severity classification to Libra's scale: Critical checks (C1-C6) → severity 4 or 5; Quality checks Q1 → severity 3; Q2-Q6, Q8 → severity 2; Q7 → severity 1.
- Cite the matching check ID (e.g., C2, Q4) in each finding's `evidence`.
- When a finding matches a common issue from `references/common-issues.md`, reference it for context.
