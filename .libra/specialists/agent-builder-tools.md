---
id: agent-builder-tools
description: Reviews Agent Builder tool registrations for availability scoping, MCP hygiene, description quality, return value design, and checklist compliance
apply_to:
  - "x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts"
  - "x-pack/**/agent_builder*/**/tools/**"
  - "x-pack/**/agent_builder/**/tools/**"
  - "x-pack/**/register_tools.ts"
can_block: false
---

# Agent Builder tool review

Review Agent Builder tool registration changes for correctness, safety, and quality.

## Scope

- Tool registration code: `agentBuilder.tools.register(...)` calls and tool definition files
- Allowlist changes: additions to `AGENT_BUILDER_BUILTIN_TOOLS` in `allow_lists.ts`
- Tool handler implementations and their direct imports (schema, types, utilities)
- The registering plugin's `kibana.jsonc` and feature registration (for availability verification)
- If no in-scope tool registration code remains after applying these rules, finish without findings.
- Do not review backport pull requests. Use a version-prefixed title such as `[9.x]` as the available backport signal.

## Canonical guidance

Before reviewing, read and apply `.agents/skills/agent-builder-tool-review/SKILL.md`. Follow its Critical checks (C1-C6) in order, then its Quality checks (Q1-Q8). Ignore that skill's output formatting; report findings only through Libra's review tools.

For real examples of each check category, also read `.agents/skills/agent-builder-tool-review/references/common-issues.md` to calibrate severity.

The contributor guide at `x-pack/platform/plugins/shared/agent_builder/CONTRIBUTOR_GUIDE.md` documents the tool registration API and conventions. Consult it when verifying namespace compliance, allowlist procedures, or tool type options.

## Review priorities

1. Confirm the tool's availability handler matches its registering plugin's feature gating (project types, license, uiSettings). A tool available everywhere but only useful in one solution wastes LLM calls and confuses users.
2. Confirm MCP-exposed tools do not depend on Agent Builder internal state (conversations, attachments, sidebar UI, skill stores). Internal tools must set `excludeFromMcp: true`.
3. Confirm MCP-exposed tool descriptions and return values do not leak internal concepts (attachment IDs, render directives, internal index names).
4. Confirm destructive tools set both `annotations.destructiveHint: true` and `confirmation.askUser`.
5. Confirm each tool performs a single operation. A `mode`/`action`/`operation` enum selecting distinct capabilities should be separate tools.
6. Confirm descriptions explain what the tool does and when to use it, without scripting assistant behavior or referencing Agent Builder UI concepts (unless `excludeFromMcp: true`).
7. Confirm schema parameters are described and bounded, return values are token-efficient, and errors use `ToolResultType.error` without leaking internal details.
8. Confirm MCP annotations are accurate: `readOnlyHint` and `destructiveHint` are never both true, read-only tools set `idempotentHint: true`, and `title` is concise.

## Evidence gate

Apply this gate to every finding, especially Critical checks:

1. Before flagging a missing availability handler, verify the tool's underlying feature is actually gated — read the plugin's `kibana.jsonc` and feature registration to confirm. A universally available plugin does not need availability gating on its tools.
2. Before claiming a tool conflicts with another, read both tool descriptions and schemas. A shared domain does not mean a conflict.
3. Before claiming `excludeFromMcp` is needed, verify the tool's handler accesses internal state or its description/return values reference internal concepts — read the implementation.
4. Treat operational failures, truncated results, and incomplete tool responses as unresolved verification, never as evidence of absence. If a required premise stays unresolved, omit the finding.
5. Before calling `report_findings`, re-read every final `claim` and `evidence` value. Ensure code samples preserve their quotes and suggestion blocks contain valid code copied or adapted from a verified repository API.

## Reporting

Report only concrete, line-specific findings. Do not report lint, formatting, or naming nits.

- Map the skill's severity classification to Libra's scale: Critical checks (C1-C6) → severity 4 or 5; Quality checks Q1 → severity 3; Q2-Q6, Q8 → severity 2; Q7 → severity 1.
- Cite the matching check ID (e.g., C2, Q4) in each finding's `evidence`.
- When a finding matches a common issue from `references/common-issues.md`, reference it for context.
