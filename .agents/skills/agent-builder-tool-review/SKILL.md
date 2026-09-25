---
name: agent-builder-tool-review
description: Review Agent Builder tool registrations for availability scoping, MCP hygiene, description quality, return value design, single responsibility, and annotation correctness. Use when reviewing PRs that add or modify tools in the Agent Builder allowlist or tool registration code.
---

# Agent Builder Tool Review

Review Agent Builder tool registrations and allowlist changes against this checklist. Produce actionable, PR-review-ready findings grounded in the changed code and its direct imports.

## When to Use

- PR adds a tool ID to `AGENT_BUILDER_BUILTIN_TOOLS` in `allow_lists.ts`
- PR adds or modifies a `agentBuilder.tools.register(...)` call
- PR changes a tool's handler, schema, description, annotations, or availability config

## Scope

- Changed tool registration files and their direct imports (handler, schema, types)
- The tool's entry in `allow_lists.ts`
- The registering plugin's `kibana.jsonc` and feature registration (for availability checks)
- Do not review backport PRs (version-prefixed title such as `[9.x]` or `backport` label)

## Canonical References

Read these before reviewing. They define the tool registration API and conventions:

- Contributor guide: `x-pack/platform/plugins/shared/agent_builder/CONTRIBUTOR_GUIDE.md`
- Tool definition types: `x-pack/platform/packages/shared/agent-builder/agent-builder-common/tools/definition.ts`
- Built-in tool type: `x-pack/platform/packages/shared/agent-builder/agent-builder-server/tools/builtin.ts`
- Allowlist: `x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts`
- Namespaces: `x-pack/platform/packages/shared/agent-builder/agent-builder-common/base/namespaces.ts`
- Availability config: `x-pack/platform/packages/shared/agent-builder/agent-builder-server/availability.ts`

## Critical Checks

These are blockers (severity 4-5). A tool failing any critical check should not be merged without resolution.

### C1: Allowlist entry exists

The tool ID is present in `AGENT_BUILDER_BUILTIN_TOOLS` in `allow_lists.ts`. The ID in the allowlist exactly matches the `id` field on the tool registration.

### C2: Availability matches feature gating

If the registering plugin's feature is gated — by project type, uiSetting, license level, or space configuration — the tool MUST have an `availability` handler that returns `{ status: 'unavailable' }` when the feature is off. Tools without an `availability` handler are assumed universally available across all project types and spaces.

**How to verify:**
1. Find the registering plugin's `kibana.jsonc` and feature registration (look for `features.registerKibanaFeature` or `features.registerElasticsearchFeature` calls in the plugin's setup)
2. Check if the plugin or feature has project-type restrictions (`supportedProjectTypes`), license requirements (`minimumLicense`), plugin enable flags (`xpack.*.enabled` / `enabledOnlyIn`), or uiSetting gates
3. If gated: verify the tool has an `availability` handler matching those conditions
4. If not gated: confirm the tool genuinely works across all project types and deployment modes

A tool that is available everywhere but only *useful* in one solution should still be flagged — the LLM will waste calls on tools that return errors outside their intended context.

### C3: MCP exposure decision

Tools that depend on Agent Builder internal state MUST set `excludeFromMcp: true`. MCP clients have no access to conversations, attachments, sidebar UI, or Agent Builder-specific prompt state.

Internal state includes:
- Conversation context (`context.runContext`, conversation IDs, rounds, message history)
- Attachments (`context.attachments`, creating/reading/updating/rendering attachments)
- Sidebar / canvas UI (opening panels, setting preview states, render directives)
- Agent Builder-specific stores (`context.resultStore`, `context.stateManager`, `context.skillsStore`)

**How to verify:**
1. Read the tool's handler implementation
2. Check if it accesses `context.attachments`, `context.resultStore`, `context.stateManager`, `context.skillsStore`, or conversation-specific APIs
3. Check if the description or return values mention "attachment", "render inline", "conversation", or other internal concepts
4. If internal: verify `excludeFromMcp: true` is set
5. If MCP-exposed: verify the tool works standalone without Agent Builder UI state

### C4: No internal detail leakage via MCP

For MCP-exposed tools (`excludeFromMcp` is not `true`):

- Description must not reference attachments, render directives, conversation metadata, or Agent Builder internals
- Return values must not include attachment IDs, render instructions, or conversation-scoped references
- Error messages must not expose internal index names (`.kibana_*`, `.chat-*`), saved object IDs, or system architecture details

Check the tool's description string, `ToolResultType` usage in the handler, and error handling paths.

### C5: Confirmation policy for destructive operations

Tools that create, update, or delete resources must:
1. Set `annotations.destructiveHint: true` (for delete/irreversible overwrite) or ensure `annotations.readOnlyHint` is not `true` (for create/update)
2. If `annotations.destructiveHint: true`: set `confirmation.askUser` to `'always'`. Using `'once'` is permitted but should be flagged as a **warning** (non-blocking) — `once` reuses the first confirmation for all subsequent calls to the same tool in a conversation, which can silently authorize deletes of different resources
3. Never set both `readOnlyHint: true` and `destructiveHint: true`

MCP clients bypass Agent Builder's UI confirmation dialog, so the annotation is the only signal an MCP host has to gate destructive calls.

### C6: Namespace compliance

The tool ID must use a registered protected namespace from `protectedNamespaces` in `namespaces.ts`. If a new namespace is needed, it must be added there. Tool IDs must match the pattern `/^(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/` and be at most 64 characters.

## Quality Checks

These are non-blocking but should be reported (severity 1-3).

### Q1: Single responsibility (severity 3)

Each tool should perform one operation. Flag tools whose input schema includes a `mode`, `action`, `operation`, or `type` enum that selects between functionally distinct capabilities. These should be separate tools because:
- The LLM needs distinct descriptions to pick the right tool
- MCP annotations differ per operation (a read and a delete have different `destructiveHint`)
- Confirmation policies differ per operation

### Q2: Description quality (severity 2)

The description should explain what the tool does, when to use it, and what it returns.

Flag descriptions that:
- Script assistant behavior: "tell the user...", "respond with...", "say to the user...", "inform the user..."
- Include rendering instructions: "render this inline", "display in the sidebar", "show in the canvas"
- Reference Agent Builder UI concepts when the tool is MCP-exposed
- Are too vague to distinguish from similar tools in the same domain

### Q3: Schema parameter quality (severity 2)

- All parameters have `.describe()` strings explaining their purpose
- Required vs optional is intentional, not defaulting to "everything required"
- String parameters are bounded: `z.string().max(N)` or `schema.string({ maxLength: N })`
- Array parameters are bounded: `z.array(...).max(N)` or `schema.arrayOf(..., { maxSize: N })`
- Enum values have clear semantics

### Q4: Return value token efficiency (severity 2)

- Results are compact for the information they convey
- No duplicated data across result items (e.g., repeating the same schema block per item)
- Large payloads implement `summarizeToolReturn` for conversation history
- Unbounded results set `maxResultTokens`
- Results carry structured data, not prose narratives the LLM must parse

### Q5: Error handling (severity 2)

- Errors return `ToolResultType.error` results, not thrown exceptions
- Error messages are actionable: "index 'foo' not found", not "ZodError: invalid_type at path..."
- No raw Zod validation traces, stack traces, or internal exception details
- No internal index names, saved object IDs, or system architecture in error messages

### Q6: MCP annotations accuracy (severity 2)

All five annotation fields must be set and accurate:

| Pattern | title | readOnlyHint | destructiveHint | idempotentHint | openWorldHint |
|---------|-------|-------------|-----------------|----------------|---------------|
| Pure read (search, list, get) | 2-5 word noun phrase | true | false | true | false |
| Create / upsert | 2-5 word noun phrase | false | false | false | false |
| Delete / irreversible overwrite | 2-5 word noun phrase | false | true | false | false |
| Calls external API/webhook | 2-5 word noun phrase | combine with above | combine with above | combine with above | true |

Rules:
- `title` should be concise and descriptive (2-5 words)
- `readOnlyHint` and `destructiveHint` must never both be `true`
- Read-only tools should set `idempotentHint: true`

### Q7: Tags (severity 1)

Tags should include the solution domain (`observability`, `security`, `platform`, `search`). Tags help with tool filtering and agent configuration.

### Q8: No conflict with existing tools (severity 2)

The tool's description should be distinct enough that an LLM won't confuse it with an existing tool. If functionally similar tools exist, the descriptions should clearly state when to use each.

To verify: search `allow_lists.ts` for tools in the same namespace or with overlapping names, and compare descriptions.

## Evidence Gate

Apply this gate to every finding before reporting:

1. Before flagging a missing availability handler, verify the tool's underlying feature is actually gated — read the plugin's `kibana.jsonc` and feature registration to confirm.
2. Before claiming a tool conflicts with another, read both tool descriptions and schemas. A shared domain doesn't mean a conflict.
3. Before claiming `excludeFromMcp` is needed, verify the tool's description or return values actually reference internal concepts — read the handler implementation.
4. Treat `read_file` failures, truncated results, and incomplete tool responses as unresolved verification, not evidence of absence. If a required premise stays unresolved, omit the finding.
5. Before submitting findings, re-read each claim and evidence value for accuracy.

## Common Issues Reference

For real examples of each check category, see `references/common-issues.md`. These are drawn from issues filed against tools that shipped without proper review.
