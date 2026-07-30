---
name: review-connector
description: Review connector spec changes (spec, docs). Use when reviewing a PR involving connector specs, doing post-creation review after create-connector or build-connector, or preparing a connector PR checklist.
---

# Review Connector

Use this skill when reviewing or preparing changes to a **connector spec** (spec code, documentation). Apply the checklist below; use the optional thorough check when the user asks for deeper validation against the vendor API.

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
- **Per-action auth scopes — every location, not just one**: Check whether any action (especially
  delete/bulk/admin operations, or ones hitting a different API sub-resource like alert/rule endpoints)
  needs a scope beyond the connector's baseline. A scope requirement is typically stated in *three*
  places, and they must all agree: the auth field's in-product `helpText`, the docs page's
  "Authentication"/config summary line, and the docs page's "Get API credentials" setup steps. It is NOT
  enough for the scope to appear in just one of these — grep the diff for every scope string mentioned in
  any of the three, diff the sets, and flag a mismatch even if the *docs* are internally correct but the
  in-product `helpText` (what most users will actually see when creating the connector) is missing it, or
  vice versa. This exact failure mode shipped once already: the docs' setup steps correctly listed an
  extra scope needed for two actions, but the in-UI helpText and the docs' own Authentication summary line
  did not, so a user following the in-UI hint got a 403.
- **`test.enabled`**: If the spec defines a `test` block, it must include `enabled: true`. Without it, the
  handler compiles and type-checks fine, but the "Test connector" button stays disabled in the Kibana UI.
  Flag any `test` block missing `enabled: true`.
- **ICU-unsafe help text**: Any string passed through `i18n.translate()` (`metadata.description`, `.meta({ helpText })`,
  etc.) is parsed as an ICU message — a literal `<placeholder>` is read as an unclosed XML tag and throws
  `FORMAT_ERROR` at spec-serialization time. Flag any translated string containing bare `<...>`.
- **OAuth defaults vs placeholders**: Every `defaults` value must be paired with `{ hidden: true }` in `overrides.meta`
  so the field is invisible in the form. Defaults for visible fields will overwrite encrypted user values on "Edit".
  For fields where the user must enter their own value (e.g. tenant-specific URLs), use `placeholder` in
  `overrides.meta` instead of a `default`. For fields that should never be edited (e.g. fixed OAuth endpoints, scopes),
  use both a `default` and `{ hidden: true }`. Flag any visible auth field that has a `default` without `{ hidden: true }`.
- Spec is exported from `all_specs.ts`. Do not add unused/cargo-culted flags; only set flags the platform or this
  connector actually uses.
- **Input schemas & types**: Action input schemas and their `z.infer<>` types must live in a separate
  `types.ts` file alongside the spec (not inline in the spec file, and not as `as` casts in handlers).
  Handlers must be typed with the inferred type (e.g. `handler: async (ctx, input: SearchInput) => {}`),
  not `input as { field: string }`. See `servicenow_search/types.ts` for the canonical pattern.

### Vendor API Correctness

These are easy to write incorrectly by assuming generic REST conventions instead of checking the vendor's
actual documented behavior — flag them even without live access to the API, based on what the code assumes:

- **Partial vs. full-replace updates**: If an update action sends only the fields present in its input,
  check whether the underlying endpoint is a `PATCH`/merge or a `PUT`/full-replace. A `PUT` handler that
  doesn't first `GET` the current resource and backfill omitted fields will silently drop or reject
  partial updates. This is easy to miss in review because the code "looks like" a normal partial update.
- **Array query-parameter serialization**: If an action sends an array as query params (e.g. a list of
  IDs), check whether the code special-cases the serialization (e.g. a custom `paramsSerializer`) or
  relies on the HTTP client's default. A vendor expecting the repeated-key form (`?id=1&id=2`) will reject
  the client library's default bracketed form (`?id[]=1&id[]=2]`), or vice versa — this doesn't show up in
  unit tests that mock the client.
- **"At least one of" update inputs**: If every field on an update-action's input schema is optional, check
  for a `.refine()` (or equivalent) requiring at least one to be set. Without it, a call with no fields set
  silently no-ops instead of erroring.
- **Regional/self-hosted base URLs**: If the connector has a configurable base URL, check that its help
  text/docs mention any regional SaaS domains or self-hosted deployment patterns the vendor supports — a
  connector that only mentions the single default domain will 404 for a subset of real accounts.
- **Unencoded URL path segments**: Any handler that interpolates a user-supplied or config-derived value
  (an ID, slug, or org name) into a URL path segment — e.g. `` `${baseUrl}/issues/${input.issueId}/` `` —
  must wrap it in `encodeURIComponent()`. Input schemas typically only bound length (`.max()`), not
  character set, so a value containing `/`, `?`, `#`, or a space is valid input that will otherwise
  corrupt the request path. Check every `${...}` inside a URL template literal, including config values
  like an organization slug. This is easy to miss in review because the code "looks like" normal template
  interpolation, and easy to miss in tests that only exercise plain alphanumeric IDs.

### LLM Descriptions and Skill Content

- **`isTool`**: Actions intended for AI agent use should set `isTool: true` (the default is `false`, which hides the
  action from Agent Builder). Most actions should be tools. Flag actions that are missing `isTool: true` unless there
  is a clear reason to hide them (e.g. destructive or admin-only operations).
- Every action has a `description` field that clearly explains its purpose, when to use it, and what it returns.
  Flag actions with missing, vague, or generic descriptions that would not help an LLM choose the right action.
- **Action descriptions must be plain strings** — they are for LLM consumption only and should NOT use `i18n.translate()`.
  In contrast, `metadata.description` IS shown in the UI and MUST use `i18n.translate()`. Flag any action description
  wrapped in `i18n.translate()`, and flag any `metadata.description` that is a plain string without i18n.
- **Download/binary actions**: Actions that return base64-encoded or binary data must include a WARNING in their
  description advising agents to only call them when they have a plan to process the data (e.g. via an Elasticsearch
  ingest pipeline attachment processor). Flag download actions that lack this guidance.
- Every Zod param has `.describe()` with useful guidance: examples, constraints, format hints (e.g. query syntax,
  allowed values, units). Params without `.describe()` leave LLMs guessing — flag them.
- The `skill` property (if present) covers multi-step patterns, common gotchas, and cross-action references that
  help an LLM use the connector correctly. Review for accuracy and completeness. The `skill` should NOT repeat
  information already in action `description` fields or param `.describe()` calls — it should add higher-level
  guidance that cannot be expressed per-action (e.g. "call X before Y", auth-mode differences, pagination patterns,
  typical workflows). Flag `skill` content that is redundant with individual action/param descriptions.
- Reference ServiceNow, Slack, and GitHub connector specs as quality benchmarks for description and skill content.
- Look at existing connector specs for patterns (e.g. `slack/`, `github/`, `servicenow_search/`)

### Documentation and Icons

- Generator scaffold docs are filled in (no remaining `TODO:` placeholders)
- **Snippets file**: Third-party data connectors (cloud storage, SaaS search, etc.) belong in
  `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md`, **not**
  `elastic-connectors-list.md` (which is reserved for Kibana-native connectors like Cases, Index,
  ServerLog, and Obs AI Assistant). Order them alphabetically. Flag any third-party connector 
  entry added to the wrong file.
- `docs/reference/toc.yml` entry exists in the correct section and matches alphabetical order in that section.
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

### PR Description

- **`## Validated` table**: The PR description must include a `## Validated` section with a table
  listing every action the spec exposes (plus the connectivity `test` handler, if present) and whether
  it's been observed working — see
  `create-connector/reference/pr-validation-table.md` for the required format. Flag a PR that's missing
  this section entirely, is missing rows for some of the connector's actions, or marks an action
  `✅ Pass` with no concrete scenario described. If live testing hasn't happened yet, every row should
  still be present, marked `⚠️ Not validated — needs manual verification` — that's acceptable, an
  entirely missing table is not.
- **Labels**: The PR must have both `release_note:feature` and `Feature:Actions/ConnectorTypes` applied
  (check with `gh pr view <number> --json labels`). Flag if either is missing.

### Naming and Conventions

- Directory and file names follow repo conventions (snake_case for dirs/files; camelCase for TS exports)
- Connector IDs don't collide with existing ones. If a connector already exists for the same product, use
  a distinct ID (e.g. `.servicenow_search`)
- If the PR changes behavior that could affect existing callers, document why and address backwards compatibility in
  the PR description
- **TypeScript** (touched files): Use strict equality (`===` / `!==`), follow repo style (early returns, explicit
  types, no `any`)
- **Dead code from iteration**: Flag schemas, types, or constants that are defined but never referenced —
  common leftovers from an earlier design that was later simplified.
- **Duplicated calls**: Flag a helper (e.g. a URL builder) called more than once within the same handler
  when the result could be computed once into a local variable.

### Security

- **Unbounded strings in Zod schemas**: Every `z.string()` in action input schemas should have a `.max(N)`
  constraint to prevent DoS from oversized inputs. This is flagged by CodeQL. Common limits: 2000 for
  freeform queries, 1024 for paths/URLs, 200 for IDs/names, 50 for short tokens or enum-like strings.
  Also applies to strings inside `z.array(z.string())` and `z.record(z.string(), ...)` key types.
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
