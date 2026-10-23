---
name: create-connector
description: Creates a new connector spec for Kibana. Use when asked to create (or add) a new connector, integration, or data source.
allowed-tools: WebFetch, WebSearch, Read, Grep, Glob, Write, Edit, Bash, Skill
context: fork
argument-hint: [3rd-party-service-name]
---

# Create a Connector

We're going to create a new connector spec for **$0**. The connector will enable Kibana to interact with the third-party service and expose operations as tools for AI agents.

## Reference Materials

- **[reference/connector-patterns.md](reference/connector-patterns.md)** — Directory structure, file templates, and registration patterns
- **[reference/pr-validation-table.md](reference/pr-validation-table.md)** — Format for the `## Validated` action-by-action table required in every connector PR description

## Step 1: Determine the Connector Strategy

Check if $0 has an official hosted MCP server. If so, creating an MCP-native connector is preferred.

**MCP server available?** → Read [reference/mcp-connector-setup.md](reference/mcp-connector-setup.md) and follow its steps.

**No MCP server available?** → Read [reference/custom-connector-setup.md](reference/custom-connector-setup.md) and follow its steps.

Follow only the steps for the chosen path. Do not mix them.

### Research the vendor API before writing schemas or handlers

For a custom (non-MCP) connector, do this before Step 2. For each action you plan to implement, find the
vendor's real API docs and verify — don't assume: update semantics (partial vs. full-replace, including
nested objects sent whole), the HTTP method and body shape of that exact route, how array query params
are encoded, whether optional modifier params (`scope`, filters, flags) on `POST`/`PATCH` actions belong
in the query string or the JSON body, the auth scope or cloud role (and the level it is granted at) each
action needs, each identifier field's allowed format, each input field's documented limits (length,
item count, numeric range, size in bytes, and limits shared across fields), the resource variants the
vendor documents, and whether the service has regional/self-hosted domain variants. See "Research the
Vendor API Before Writing Any Code" in
[reference/custom-connector-setup.md](reference/custom-connector-setup.md) for the full checklist. Bugs
found late (during manual testing or review) that trace back to skipping this step are expensive to fix
one action at a time — verifying up front is cheaper.

**If the vendor API is GraphQL**, docs examples and general familiarity are not enough to get input type
names and field selections right — verify every hardcoded type/field name against the real schema via
introspection before writing the handler. See "Verify GraphQL Schemas via Introspection" in
[reference/custom-connector-setup.md](reference/custom-connector-setup.md).

## Step 2: Create the Connector Spec

Create the connector spec in `src/platform/packages/shared/kbn-connector-specs/src/specs/{connector_name}/`.

Follow the patterns in [reference/connector-patterns.md](reference/connector-patterns.md):

1. **`{connector_name}.ts`** — ConnectorSpec definition with metadata, auth, schema, and actions
2. **`types.ts`** — Zod input schemas and inferred TypeScript types for each action
3. **`{connector_name}.test.ts`** — Unit tests
4. **`icon/index.tsx`** — Brand icon component
5. **Helper files, when the spec file passes 500 lines** — request plumbing, response shaping and
   credential exchanges in sibling files, each with its own test file. Keep `{connector_name}.ts` under
   500 lines and never over 1000; see
   [Keep the spec file under 500 lines](reference/connector-patterns.md#keep-the-spec-file-under-500-lines)

Register in `src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts` and `connector_icons_map.ts`.

### `supportedFeatureIds` on a brand-new connector: two-step release

A new connector type must reach Production-NonCanary before it can declare user-facing features.
Serverless rollouts and rollbacks leave nodes on different Kibana versions for a while, and a user action
referencing a connector type that a node does not have breaks on that node. So the first PR ships
`supportedFeatureIds: ['agentBuilder']`.

Do not put `'workflows'` or any other user-facing feature ID in the first PR. Those are added in a
follow-up PR once the connector is registered in every Production-NonCanary version.

Mention the required follow-up PR in the first PR's description so it is not forgotten.

**MCP connectors**: Use [reference/mcp-connector-setup.md](reference/mcp-connector-setup.md) as the direct starting template for the spec — it has concrete, copy-ready examples with the correct `lazySchema`, `callToolJson`/`callToolContent`, and test-mock patterns already in place. Do not reverse-engineer from existing connectors.

**Type every handler explicitly.** Annotate each action's `input` parameter with its `z.infer`-derived
type from `types.ts` (`handler: async (ctx, input: SearchInput) => { ... }`). Without the annotation it
silently resolves to `any` — nothing fails to compile, but the handler gets zero type checking against
its own Zod schema. Do this for every action as you write it, not as a later cleanup pass; with a dozen
or more actions in one file it's easy to leave some untyped if you defer it.

**Wrap every Zod schema in `lazySchema()`.** Whenever a Zod schema is assigned to a variable, wrap it in
`lazySchema(() => ...)` from `@kbn/zod/v4`. This covers the input schemas in `types.ts` and also
module-level helpers, e.g. `const IpAddressSchema = lazySchema(() => z.union([z.ipv4(), z.ipv6()]));`.
Wrap the spec's `schema` and any inline action `input` the same way. `lazySchema` defers building the
schema until first use, so loading the connector registry does not build every connector's schemas at
import time.

**Keep `test.enabled: true`.** The scaffold generates `test: { enabled: true, handler: ... }` — don't
drop `enabled` when you flesh out the handler body.

**Do not add `events`.** Optional inbound `ConnectorSpec.events` is gated by
`SPECS_ALLOWED_EVENTS` in `src/specs_allowed_events.ts`. Omit `events` unless the
connector id is in that allowlist (connectors may eventually declare both `actions` and
`events`). 

Replace the placeholder icon with a proper brand icon. Do NOT generate an icon, use the official brand icon or tell the
user you could not find one. Search for existing SVG/PNG files in:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/*/icon/`
- `x-pack/platform/plugins/shared/stack_connectors/public/connector_types/{connector}/`

## Step 3: Write LLM-Quality Descriptions and Skill Content

AI agents rely on descriptions to choose the right action and construct valid inputs. Every action and parameter must have high-quality descriptive text.

### `isTool`, `scope`, and action descriptions

Actions should set `isTool: true` to be discoverable by AI agents in Agent Builder. This is the default for most actions. Use `isTool: false` only for actions that should not be invoked autonomously (e.g. destructive or admin-only operations).

Every `isTool: true` action **must** also have an explicit `scope` field — never omit it. Classify each action:

- `scope: 'read'` — pure reads; no external state modified (GET-only, searches, listings, downloads)
- `scope: 'write'` — creates or appends new data without touching existing state (send message, create resource, add comment)
- `scope: 'destroy'` — overwrites, updates, or deletes existing state (resolve/update/delete anything, patch a record); also use for generic escape-hatch actions (`request`, `callTool`, `callRestApi`) since they can do anything

When uncertain, prefer `'destroy'` over `'write'` — it's safer to over-classify. See the `scope` section in [reference/connector-patterns.md](reference/connector-patterns.md) for the full table and examples.

Every entry MUST have a `description` field (plain string, NOT `i18n.translate()`) that explains:
- What the action does
- When an agent should use it (vs. other actions)
- What it returns
- For download/binary actions: a WARNING about large base64 payloads and the need for post-processing

### Parameter descriptions

Every Zod parameter in input schemas MUST have a `.describe()` call that includes:
- What the parameter controls
- Concrete examples or allowed values
- Any constraints (format, length, required vs. optional behavior)

See the ServiceNow, Slack, and GitHub connector specs for examples of strong description quality.

### Input bounds

Take every `.max()` and `.min()` from the vendor's documented limit for that field, never from a guess
or a neighbouring connector. A bound below the vendor limit rejects valid input; one above it lets
through input the vendor rejects. Declare each limit once as a named constant with the doc URL in a
comment, use it in every action that takes the field, and state the same number in `.describe()` and
on the docs page. When the vendor documents no limit, say so in the comment. See
[Take every bound from the vendor](reference/connector-patterns.md#take-every-bound-from-the-vendor)
for limits shared across fields, byte limits, Base64 inputs, and numeric lower bounds.

### The `skill` property

Add a `skill` property to the ConnectorSpec — a markdown string providing higher-level LLM guidance:
- Multi-step workflow patterns (e.g., "to create an incident, first call X, then Y")
- Common gotchas and error cases
- Best practices for the service

Use the `[...].join('\n')` pattern to keep the string readable in source:

```ts
skill: [
  '## $0 Connector',
  '',
  'Use this connector to ...',
  '',
  '### Common patterns',
  '- To do X, first call `actionA` then `actionB`',
].join('\n'),
```

## Step 4: Create Tests

Add tests following the existing examples:

1. **Connector spec tests** — See `google_drive/google_drive.test.ts` or `slack/slack.test.ts` for the pattern.

You do not need to execute the tests — just create the files. You should, however, run
`node scripts/eslint <path>` on every file you create or edit (including test files) before moving on.
This is fast, requires no running Kibana/Elasticsearch, and catches mechanical rule violations — e.g. a
forbidden non-null assertion (`@typescript-eslint/no-non-null-assertion`) in a test file's
`Connector.action!.handler` — that a code-reading self-review or an AI PR reviewer can miss, and that
otherwise only surface once CI's lint step fails the build.

Unit tests that mock `ctx.client` yourself cannot catch bugs where the mock encodes the same
wrong assumption as the handler (e.g. asserting on the axios default array-param serialization when the
vendor actually needs a different form, or asserting that an optional modifier param is sent as a query
param when the vendor actually expects it in the body). For any handler you flagged during vendor API
research as having non-obvious update, serialization, or query-string-vs-body semantics, add a test that
asserts on the *exact* request shape sent (URL, method, body, and params/paramsSerializer) against what the
docs say the vendor expects — not just that the handler resolves without throwing.

A mock also goes stale. When live testing or vendor docs disprove a response shape you had assumed, the
mock that encodes the old shape is a second place to fix — and a test that never asserts on the handler's
return value will keep passing with the wrong mock in place. Assert the returned value, not just that the
call resolved.

**Write tests for the paths live testing will not reach.** Verifying a connector against one real account
exercises the happy path and little else. The edges that review finds instead are predictable, so cover
them with unit tests up front — each one only if your connector has the thing it tests:

- **if an action proxies a call whose non-2xx answers are meaningful** — that non-2xx returned as a
  result, with its error body intact. An ordinary `GET` that 404s is an error and stays one; do not add
  this test by turning a real error into a result.
- **if a request sends a credential in a custom header** — a 3xx response, asserting both
  `maxRedirects: 0` and the returned `Location`
- **if a list action follows a continuation link** — a multi-page response, asserting every page is
  followed and that the page cap reports `truncated`
- **if a list action follows a continuation link** — an off-origin link, asserting pagination stops and
  no authenticated follow-up request is made. Cover a protocol-relative link (`//evil.example/items`)
  as well as an absolute one, because it reads as relative and resolves to a different origin. Without
  this case a regression that drops the origin guard still passes every test above, and the connector's
  credentials go to the host the link names
- **if an input carries a bound taken from the vendor** — the limit itself accepted and one past it
  rejected, parsed through the action's `input` schema (a test that calls the handler directly skips
  the schema). Add a **non-ASCII** case for a byte bound, and for a limit shared across fields, a case
  where each field is within its cap but the total is over
- **if a regex constrains a URL path** — every accept *and* reject case, table-driven
- **if an action polls an operation URL from a response** (`Location`, `Azure-AsyncOperation`) — an
  off-origin URL, asserting no authenticated request is made; and a 403 during polling, asserting it is
  raised at once rather than after the poll timeout
- **if an action accepts a URL-shaped cursor from the caller** — a same-host URL for a different
  tenant or repository, asserting it is rejected
- **if a handler replaces a nested object** — the least obvious field of that object set on the current
  resource, asserting it survives an update that does not mention it
- **if the connector has more than one auth type** — each auth-specific branch, with `authType` in
  `ctx.secrets` and the connector's config in `ctx.config`, as the executor builds them
- **if the vendor documents resource variants** — one fixture per variant (e.g. DNS-only cluster, System
  pool), asserting each variant's output and constraint

A connector with none of these (an MCP-only spec, or one whose actions are plain `GET` reads) owes none
of them. Write the tests its own surface needs instead.

### Self-review before handing off

First run the deterministic checks, and fix every failure for your connector:

```bash
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/connector_spec_quality_contract.test.ts
```

They check that the docs page exists at the URL derived from the connector id, that it states the
availability `supportedFeatureIds` allows (and only that), that a page for a connector without workflow
support does not describe workflow use, that the docs page avoids internal wording ("custom connector", "MCP-native",
"connector spec"), that the navigation links resolve, that every tool action and input parameter has a
description, and that every input string and array has a `.max()`. Do not re-check those by hand. The
test only checks that a bound exists; whether it matches the vendor is for you to check below.

Then, before treating the connector as done, re-read the whole diff once, end to end, specifically hunting for:

- A spec file over 500 lines — move request plumbing, response shaping and credential exchanges into
  sibling helper files with their own tests, and fold duplicated handler code into one shared function
- Any `isTool: true` action missing a `scope` field — every tool action must have one
- A `scope` that looks wrong: a "get"/"list"/"search" action marked `write` or `destroy`, or an update/delete/patch action marked `read`
- A `scope: 'read'` on an action whose request is a `POST`/`PATCH` — read the vendor's documentation for
  that route and keep `read` when it only reads (a GraphQL query and a search-with-a-body are read-only
  `POST`s); change it when the documentation says the call changes state
- Any request carrying a credential in a custom header (`x-api-key`, `x-functions-key`, `private-token`)
  without both `maxRedirects: 0` and a `validateStatus` that accepts the 3xx — axios forwards a custom
  header across a cross-host redirect, and rejects the 3xx by default
- An action that proxies a call to caller-controlled code or a caller-named route, with no
  `validateStatus` — a deliberate non-2xx answer becomes a connector error the agent cannot inspect
- A status code used as the sole evidence for a classification, *inside a proxying action* (e.g. treating
  every 401/403 as a bad credential) — the service's own authorization responses are indistinguishable
  by status. Conversely, a `test` handler or plain read that accepts 401/403 as a result — a failed
  credential check must fail
- A list action that reads `response.data.value` (or equivalent) without following the vendor's
  continuation link, or that follows a continuation URL with `ctx.client` without resolving it against
  `ctx.client.getUri()` and checking its origin first — that sends the connector's credentials to
  whatever host the link names
- Any other URL the connector did not build — a `Location`/`Azure-AsyncOperation` header, an operation
  link, a caller-supplied cursor — requested with `ctx.client` without an origin check, and for a
  caller-supplied URL, without checking its path belongs to the configured tenant and requested resource
- A list action that can return `hasMore: true` with no cursor or page input to fetch the next page,
  while a sibling list action has one
- A poll or retry loop that retries every error instead of only transient statuses (short-lived 404,
  429, 5xx), or an error explanation that treats 401 and 403 as the same thing
- `ctx.config.authType` anywhere — the discriminator is in `ctx.secrets.authType`
- A handler that `PUT`s a nested object built from input, without copying every field of that object's
  vendor type that the input does not set
- A method or body shape written by analogy with a neighbouring endpoint rather than read from that
  route's OpenAPI/swagger entry
- A returned handle (operation ID, job ID) missing an input the follow-up action needs, such as a
  project or subscription that overrides the connector default; a discovery action whose results no
  other action accepts as input
- An output field computed by the connector but named as if the vendor reported it
- A `create`/`set` action that replaces an existing value under the same key, marked `write` instead of
  `destroy`
- A `skill` recipe step whose action does not return the field the step reads; a state an action can put
  a resource into (draft, stopped) with no action to leave it
- One regex helper shared by identifier fields whose vendor formats differ, or an identifier pattern that
  rejects the vendor's fully qualified form
- A `.max()`/`.min()` with no vendor doc URL (or "documents no limit" note) above its constant, or a
  round number where the vendor documents a different one
- The same vendor field capped differently in two actions
- A page number, offset, or count without `.int()` and a `.min()`
- A required ID, title, query, or recipient list that accepts an empty value the vendor rejects; or a
  `.min(1)` on an update field where an empty value clears it
- Fields the vendor limits together (reviewers and team reviewers, To + Cc + Bcc) with no `.refine()`
  on the total
- A limit in `.describe()`, the `skill` text, or the docs page that differs from the schema
- A size bound measured with `.length` on a serialized string where the message says "bytes"
- A regex guarding a URL path that has only been tested for what it accepts, never for what it must reject
- Handlers still typed with implicit `any` (missing the `input: XInput` annotation)
- A Zod schema assigned to a variable (`const XSchema = z.…`), or a spec `schema` / inline action
  `input`, that is not wrapped in `lazySchema(() => ...)`
- `test.enabled` missing or set to `false`
- Leftover schemas/constants from earlier iterations that are no longer referenced anywhere
- Repeated calls to the same helper (e.g. building a base URL twice) that should be a single local variable
- `z.record(z.string(), ...)` or `z.array(z.record(...))` keys without a `.max()` bound
- Update-action inputs where every field is optional — should they `.refine()` to require at least one?
- ID/GUID-like fields that flow into a query or filter string without a format constraint (regex) — an
  unconstrained value here is an injection risk
- A user-supplied or config-derived value (ID, slug, org name) interpolated into a URL path segment
  without `encodeURIComponent()` — search the whole file for `` `${baseUrl} `` and check every `${...}`
  after it
- Auth scopes mentioned inconsistently across the three places a user might see them: the auth field's
  `helpText`, the docs page's "Authentication" summary line, and the docs page's "Get API credentials"
  setup steps. Grep for the scope names across all three files/sections and confirm every action's
  required scope appears in all of them, not just one
- Naming/casing inconsistencies vs. sibling connectors (e.g. `webpackChunkName` casing)
- Doc wording that could misread "required" as applying only to the last-listed parameter
- `POST`/`PATCH` actions with optional modifier params (`scope`, filters, flags) — confirm against the
  vendor's docs whether each one belongs in the query string or the JSON body, checked per action against
  the docs rather than assumed from a similar-looking sibling action in the same file
- For GraphQL-backed connectors: every input type name and response field selection in a hardcoded
  query/mutation string has been checked against the real schema via introspection, not just written from
  a docs example or general knowledge — see "Verify GraphQL Schemas via Introspection" in
  [reference/custom-connector-setup.md](reference/custom-connector-setup.md)

This mirrors what the `review-connector` skill checks — running it yourself first means real review
cycles catch new problems instead of re-flagging things you could have caught alone.

## Step 5: Write Documentation

Create a connector doc page in `docs/reference/connectors-kibana/{name}-action-type.md`.

### Prerequisites

This step requires documentation skills from https://github.com/elastic/elastic-docs-skills. Check availability by invoking `docs-check-style` (use the Skill tool). If it fails with "skill not found", stop and tell the user:

> Documentation skills are not installed. Please install them:
>
> ```bash
> curl -sSL https://raw.githubusercontent.com/elastic/elastic-docs-skills/main/install.sh | bash
> ```
>
> Then re-run this step.

### Write the doc page

1. Read 1-2 existing connector docs from `docs/reference/connectors-kibana/` as templates (for example, `zendesk-action-type.md`, `jira-cloud-action-type.md`). Follow the same structure.
2. Write the new doc page. Use `docs-syntax-help` if unsure about MyST Markdown syntax.

   Three things a template page will not teach you:

   - **State what the connector can be used with**, right after the intro paragraph, matching
     `supportedFeatureIds`. A first-PR connector ships `supportedFeatureIds: ['agentBuilder']` (see
     Step 2) — follow `gitlab-action-type.md`:

     ```
     ::::{note}
     This connector is currently available in **Agent Builder** only. Workflow support is planned for a
     future release.
     ::::
     ```

     A connector that supports both says `You can use this connector in **Agent Builder** and
     **Workflows**.`, and a Workflows-only one says it is available in **Workflows** only.

     On an Agent Builder-only page, nothing else may suggest workflow use: not the opening sentence
     ("a workflow or agent can..."), and not the actions. An `isTool: false` action on such a connector
     is reachable only through the `_execute` API — mark it `_(not yet available)_` and explain the
     marker in the note, linking the Run a connector API (copy the note from
     `databricks-action-type.md`), instead of calling it "workflow only".
   - **Do not use internal vocabulary.** "custom connector", "MCP-native", "connector spec" and
     "stack connector" are our words for our implementation; a reader has no way to tell what a
     *non*-custom connector would be. Describe what the connector does instead.
   - **Do not interrupt a Markdown table.** A paragraph inserted between two rows ends the table, and
     every row after it renders as raw pipe-delimited text with no header of its own. When you add a note
     about an action, put it below the final row — then count the rendered rows against the number of
     actions to confirm the table is still contiguous.

3. Run these skills on the new file and fix any issues:
   - `frontmatter-description` — generate the `description` frontmatter field
   - `page-opening-optimizer` — verify H1 and opening paragraph
   - `applies-to-tagging` — validate `applies_to` block
   - `docs-check-style` — check Elastic style guide compliance

### Update navigation and listings

1. Add an entry in `docs/reference/toc.yml` under the `data-context-sources-connectors.md` section (the
   scaffold generator does this automatically) — **not** the `elastic-connectors.md` section, which is
   reserved for the small, fixed set of Kibana-native connectors (Cases, Index, ServerLog, Obs AI Assistant).
2. Add a row in `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md`
   (the generator inserts a placeholder row here too — replace its `TODO` description), ordered
   alphabetically within the correct category (most connectors belong in "Third-party search"; check for
   a better-fitting category like "Threat intelligence" or "Identity management" first).
3. **Check every shared file you touched.** Run `git diff` on `toc.yml`, the connector-list snippet,
   `all_specs.ts`, `connector_icons_map.ts`, and `CODEOWNERS`. Every added line must refer to *this*
   connector, and every linked file must exist in this branch. The AKS PR added an Azure DevOps entry to
   both `toc.yml` and the snippet, pointing at a page that did not exist, most likely carried over from
   another connector built in the same session. This matters most when building several connectors in
   a row.

Once you are done developing the connector spec, tests, and documentation, let the user review your work before next steps.

### If this connector's PR hasn't been opened yet

Whenever this connector's PR is opened — whether by `build-connector`'s Task 12, a later session, or a
human — its description must include a `## Validated` section: a table listing every action the spec
exposes and whether it's been observed working. If you ran this skill standalone (not via
`build-connector`) and no live testing happened yet, still note this requirement to the user so the table
doesn't get skipped when the PR is written. See
[reference/pr-validation-table.md](reference/pr-validation-table.md) for the exact format.

The PR must also carry the `release_note:feature` and `Feature:Actions/ConnectorTypes` labels. If you open
the PR yourself, add them with `gh pr create --label "release_note:feature" --label "Feature:Actions/ConnectorTypes" ...`
(or `gh pr edit <number> --add-label ...` afterward). If a human opens the PR, remind them to add both.

## Important Notes

- **Stop if architectural gaps emerge** — This skill is for adding connectors to the catalog, not for enhancing platform features
- **Write rich descriptions** — Every action and parameter must have descriptive text that helps LLMs choose the right action and construct valid inputs; add a `skill` property with multi-step patterns and gotchas
- **Follow existing patterns** — Look at Slack, GitHub, Google Drive, and ServiceNow connectors for reference
- **DO NOT modify existing documentation** — There may be existing connectors with similar names. Do not modify their documentation files.
