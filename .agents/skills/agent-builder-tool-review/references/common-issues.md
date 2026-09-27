# Common Tool Quality Issues

Real examples from tools that shipped without proper review. Each maps to a
check in the parent SKILL.md. Use these to calibrate severity and understand
what "bad" looks like in practice.

All issues referenced are from [`elastic/agentic-interface-program`](https://github.com/elastic/agentic-interface-program).

## Availability / Scoping (C2)

**Cases tools not gated in Search projects ([#154](https://github.com/elastic/agentic-interface-program/issues/154)):** Cases tools were registered
globally but the Cases feature is not available in serverless Search projects.
Users saw tools that returned errors when called.

**Context Engine tools registered when feature is off ([#156](https://github.com/elastic/agentic-interface-program/issues/156)):** Context Engine
tools appeared in the MCP tool listing even when the Context Engine feature was
disabled. MCP clients listed tools that couldn't execute.

**Streams tools on wrong project types ([#157](https://github.com/elastic/agentic-interface-program/issues/157), [#160](https://github.com/elastic/agentic-interface-program/issues/160)):** Streams tools were
registered for all serverless project types, but the Streams UI is only available
in observability and security. On search/vectordb projects, tools appeared but
failed or returned confusing errors.

**What the review should catch:** Any tool whose registering plugin has
`supportedProjectTypes` restrictions, a license gate, or a uiSetting toggle
must have an `availability` handler that mirrors those conditions.

## MCP Exposure (C3, C4)

**Render directives leak to MCP clients ([#148](https://github.com/elastic/agentic-interface-program/issues/148)):** Tool return values included
`render_attachment` directives that only make sense inside Agent Builder's chat
UI. MCP clients received instructions they couldn't act on, polluting the
assistant's context.

**Internal identifiers in error messages ([#153](https://github.com/elastic/agentic-interface-program/issues/153)):** A query tool returned
`security_exception` errors containing internal index names (`.kibana_*`) and
system identifiers that MCP clients should never see.

**What the review should catch:** Tools exposed via MCP (no `excludeFromMcp: true`)
must not reference attachments, render directives, conversation state, or internal
index names in descriptions, return values, or error messages.

## Destructive Operations (C5)

**Workflow tool bypasses destructive controls ([#145](https://github.com/elastic/agentic-interface-program/issues/145)):** `execute_workflow` ran
destructive step types without the safeguards that `workflow_execute_step`
enforced, because the compound tool didn't inherit the step-level confirmation
policy.

**MCP bypasses confirmation dialogs ([#147](https://github.com/elastic/agentic-interface-program/issues/147)):** Streams write tools had
confirmation dialogs in the Agent Builder UI, but MCP calls bypassed them
entirely. Without `annotations.destructiveHint: true`, MCP hosts had no signal
to gate the call.

**What the review should catch:** Destructive tools must set
`annotations.destructiveHint: true` and `confirmation.askUser` to `'once'` or
`'always'`. Both signals are needed — annotations for MCP hosts, confirmation
for 1P UI.

## Single Responsibility (Q1)

**Separate read and write MCP tools ([#114](https://github.com/elastic/agentic-interface-program/issues/114)):** A combined tool handled both read
and write operations under a single description and single set of MCP
annotations. This made it impossible to annotate the read path as
`readOnlyHint: true` while the write path needed `destructiveHint: true`.

**What the review should catch:** A `mode`, `action`, or `operation` enum in
the schema that selects between functionally distinct capabilities.

## Description Quality (Q2)

**Descriptions script assistant behavior ([#149](https://github.com/elastic/agentic-interface-program/issues/149)):** Tool descriptions included
directives like "tell the user that..." and "respond with a summary of...".
These are inappropriate for MCP, where the host controls the assistant persona
and presentation.

**Extraneous conversation data in parameters ([#152](https://github.com/elastic/agentic-interface-program/issues/152)):** A tool's parameter
description encouraged passing full conversation context ("include the user's
question and any relevant conversation history"), inflating token usage and
leaking conversation state into a tool that didn't need it.

**What the review should catch:** Descriptions that contain assistant speech
directives, rendering instructions, or encourage passing conversation context
as parameters.

## Return Value Design (Q4)

**Duplicated schema per result ([#146](https://github.com/elastic/agentic-interface-program/issues/146)):** `get_connectors` repeated the same
`stepTypes` block for every connector in the response, massively inflating the
return payload.

**Full document content with no control ([#155](https://github.com/elastic/agentic-interface-program/issues/155)):** `product_documentation`
returned ~4,000 tokens of full document content per call even for simple
lookups, with no parameter to control verbosity.

**What the review should catch:** Duplicated data across result items,
unbounded result sizes, and missing `summarizeToolReturn` or `maxResultTokens`
for large payloads.

## Error Handling (Q5)

**Raw Zod validation trace ([#143](https://github.com/elastic/agentic-interface-program/issues/143)):** `create_partition` didn't pre-check the
stream type before calling downstream APIs. When called on a classic stream
(which doesn't support partitions), it returned a raw Zod validation error
trace to the LLM.

**What the review should catch:** Error paths that bubble up raw validation
traces, stack traces, or internal system details instead of structured
`ToolResultType.error` responses.

## MCP Annotations (Q6)

**Missing annotations ([#111](https://github.com/elastic/agentic-interface-program/issues/111)):** Tools shipped without MCP annotations entirely.
MCP hosts had no metadata to determine whether a tool was safe to call
automatically.

**What the review should catch:** Missing or inaccurate annotation fields,
especially `readOnlyHint`/`destructiveHint` conflicts.
