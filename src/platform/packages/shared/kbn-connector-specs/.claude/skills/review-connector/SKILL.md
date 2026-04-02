---
name: review-connector
description: Review connector spec changes (spec, workflows, docs). Use when reviewing a PR involving connector specs, doing post-creation review after create-connector or build-connector, or preparing a connector PR checklist.
---

# Review Connector

Use this skill when reviewing or preparing changes to a **connector spec** (spec code, workflows, documentation). Apply the checklist below; use the optional thorough check when the user asks for deeper validation against the vendor API.

## When to use

- Reviewing a PR that adds or changes a connector spec
- Post-creation code review (e.g. after create-connector or build-connector)
- Preparing a connector PR or self-review before opening a PR
- **Thorough check**: When the user explicitly asks for deeper validation (e.g. validate against vendor API docs); more expensive, use when quality bar is high.

## Checklist

**If the connector is MCP-native**, apply the MCP-specific checks in
[reference/mcp-connectors.md](reference/mcp-connectors.md) in addition to the items below.

### Connector Spec

- Look at existing specs for patterns: `src/platform/packages/shared/kbn-connector-specs/src/specs/`
- Valid structure with required fields, correct auth type
- **ID alignment**: `metadata.id` (e.g. `.zendesk`) and `ConnectorIconsMap` key match. IDs must start with a dot.
- **`metadata.description` quality**: The description must list the key actions the connector supports and the objects
  they operate on (e.g., "Search messages, list public channels, and send messages in Slack"). Flag descriptions that
  are vague ("Connect to X to pull data"), say nothing about capabilities ("Kibana Stack Connector for X"), or omit
  actions the connector actually provides. Keep to one sentence, ~15 words.
- **Schema UI**: Every config field in `schema` has `.meta()` with at least `label` (or uses a `UISchemas.*` helper).
  Otherwise fields render as unlabeled.
- **Action param schema (Workflow editor)**: For custom connector actions, the Zod schema in the input handler should
  give each param a short, clear `.describe()` so the Workflow editor shows helpful descriptions when mapping inputs.
- **Auth**: Auth type matches the service. **Auth format** (e.g. header value) must match the vendor's official docs;
  document or link how to obtain tokens. For OAuth, use defaults/overrides so users only fill instance URL, client ID,
  client secret where possible.
- Spec is exported from `all_specs.ts`. Do not add unused/cargo-culted flags; only set flags the platform or this
  connector actually uses.
- **Input schemas & types**: Action input schemas and their `z.infer<>` types must live in a separate
  `types.ts` file alongside the spec (not inline in the spec file, and not as `as` casts in handlers).
  Handlers must be typed with the inferred type (e.g. `handler: async (ctx, input: SearchInput) => {}`),
  not `input as { field: string }`. See `servicenow_search/types.ts` for the canonical pattern.

### Workflows

- Valid workflow YAML with correct step types
- Proper Liquid templating syntax (no malformed `{{ }}` expressions)
- Only pass parameters that the connector action or MCP tool actually accepts (check the tool's `inputSchema` —
  some params in third-party docs may be outdated or unavailable)
- **Parameter descriptions**: Every workflow input has a clear `description`. For **query/search** parameters, state
  the **vendor-specific format** concisely (e.g. Zendesk `field:value`, JQL, Lucene) and whether it's free text, a
  DSL, or both. For optional params with defaults or fixed options, name the default and/or list allowed values.
- **Optional params**: For optional inputs with a default, name the default in the description. For enum-like or
  constrained options, list allowed values or use a **choice** type in the workflow with **options** so the AI and UI
  get valid options.
- **Output field limiting**: If a tool returns many fields, use a `data.map` step after the connector call to select
  only the relevant fields. This keeps context window usage low and responses focused. See the Zendesk `search.yaml`
  workflow for the canonical pattern.
- Short commented-out field lines inside `data.map` are fine; avoid long commented blocks.
- Workflows that are AI tools have the right tag (e.g. `agent-builder-tool`).
- Connector reference uses the correct template variable (e.g. `<%= github-stack-connector-id %>`); inputs use the
  correct syntax (e.g. `${{ inputs.query }}`).
- Workflows are imported in the connector spec and listed in `agentBuilderWorkflows`.
- Look at existing connector specs with workflows for patterns (e.g. `slack/`, `github/`, `google_drive/`)

### Documentation and Icons

- Generator scaffold docs are filled in (no remaining `TODO:` placeholders)
- `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md` entry filled in
- `docs/reference/toc.yml` entry exists in the correct section
- **Icon**: Connector has an icon (ConnectorIconsMap entry and icon component or asset). No
  placeholder icons or generated icons. If a brand icon does not exist elsewhere in the repo, prompt the user to provide one.

#### Docs quality checks

If the PR includes documentation changes in `docs/reference/connectors-kibana/`, run the following skills on each
connector doc file. These require skills from https://github.com/elastic/elastic-docs-skills — if any are
unavailable, tell the user to install them (`curl -sSL https://raw.githubusercontent.com/elastic/elastic-docs-skills/main/install.sh | bash`).

1. **`docs-check-style`** — Elastic style guide compliance. Flag violations.
2. **`crosslink-validator`** — Validate cross-links resolve. Flag broken links.
3. **`frontmatter-audit`** — Check `applies_to`, `description`, `navigation_title` completeness.
4. **`content-type-checker`** — Verify page follows correct content type guidelines.
5. **`applies-to-tagging`** — Validate `applies_to` tags match connector availability.

Report documentation issues alongside code issues.

### Naming and Conventions

- Directory and file names follow repo conventions (snake_case for dirs/files; camelCase for TS exports)
- Connector IDs don't collide with existing ones. If a connector already exists for the same product, use
  a distinct ID (e.g. `.servicenow_search`)
- If the PR changes behavior that could affect existing callers, document why and address backwards compatibility in
  the PR description
- **TypeScript** (touched files): Use strict equality (`===` / `!==`), follow repo style (early returns, explicit
  types, no `any`)

### Security

- **SSRF**: Any URL field in connector config or workflow action input (e.g. `base_url`, `endpoint`, `webhook_url`)
  must be validated. URLs should be allowlisted, restricted to HTTPS, or otherwise prevented from being user-controlled
  in a way that could trigger requests to internal/private hosts. Flag any case where a user-supplied URL flows
  directly into a network call without validation.
- **Sensitive data in logs**: Check that query parameters and user-supplied inputs are not logged. Queries come
  directly from users in chat and may contain sensitive context. Look for `logger.debug`, `console.log`, or any
  logging that captures `query`, `input`, `prompt`, or similar fields; flag these as high-risk.

### Tool Design

- **Discovery / metadata tools**: The tool set should include at least one tool that helps an agent orient itself —
  e.g. `who_am_i`, `get_current_user`, `list_projects`, `get_table_schema`, `list_spaces`. Without these, an agent
  must guess IDs or structure before it can call other tools. Flag if the set has no discovery/metadata tooling.
- **Tool consolidation**: Look for tools that do the same operation on different entity types (e.g. `get_issue_by_id`,
  `get_ticket_by_id`, `get_task_by_id`). Where practical, these should be consolidated into one tool with a `type`
  enum parameter. Flag redundant tools and suggest a merged alternative.
- **Tool completeness**: Consider whether the full set of tools is sufficient for agents to answer realistic user
  questions against this connector. Would you, given only these tools, be able to find the answer to questions a
  user is likely to ask? Flag obvious gaps (e.g. search-only tooling with no way to drill into a result, or write
  operations with no way to read back state).
- **API efficiency**: Check whether tools are designed to minimize round-trips. Are tools making redundant API calls?
  Are there patterns that will force agents into trial-and-error loops (e.g. a tool that requires an ID with no tool
  to discover it)? Flag workflows that will reliably require multiple back-and-forth calls for a single user goal.

List all issues found. If no issues, note that the code looks good.

---

## Thorough check (optional)

Run when the user asks for **thorough** or **deep** validation. Same areas as the checklist, with deeper validation:

1. **Vendor API**: Find official API docs; map actions to endpoints; confirm auth format and version. Verify auth
   header/body format matches vendor docs exactly.
2. **Input validation**: Compare connector/workflow input schema to the official API — parameter names, required vs
   optional, types, constraints (enums, min/max, format). Report mismatches and suggest fixes.
3. **Output shape**: Compare expected response shape to the actual API response in the docs — top-level shape,
   fields, maps/arrays, pagination fields. Report expected vs actual for any mismatch.
