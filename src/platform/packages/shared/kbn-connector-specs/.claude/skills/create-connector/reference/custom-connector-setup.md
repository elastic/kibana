# Custom Connector Setup

Instructions for setting up a new custom connector spec (not MCP-backed).

## Run the Scaffold Generator

```bash
node scripts/generate connector <name> --id ".<id>" --owner "<team>"
```

Replace `<team>` with the GitHub team that will own this connector (e.g., `@elastic/response-ops`, `@elastic/workchat-eng`, `@elastic/workflows-eng`). If unsure, ask the user which team should own the connector in CODEOWNERS.

The generator creates:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.ts` — connector spec stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.test.ts` — test stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/icon/index.tsx` — icon placeholder
- `docs/reference/connectors-kibana/<kebab-name>-action-type.md` — documentation page

And updates:
- `src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts` — export
- `src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts` — icon mapping
- `.github/CODEOWNERS` — ownership rule
- `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md` — third-party connectors list
- `docs/reference/toc.yml` — table of contents

**Doc placement**: the generator adds the new entry to the third-party
`data-context-sources-connectors-list.md`/`data-context-sources-connectors.md` list, inside the first
category block (`**Third-party search**`). This is correct for the overwhelming majority of connectors.
`elastic-connectors-list.md`/`elastic-connectors.md` is reserved for the small, fixed set of
**Kibana-native** connectors (Cases, Index, ServerLog, Observability AI Assistant) — do not add a new
entry there unless you are certain the connector is Kibana-native rather than a third-party integration.
If the connector belongs in a more specific category (e.g. "Threat intelligence", "Identity management"),
move the auto-inserted entry there manually and re-check alphabetical order within that category.

**After running the generator, go through each generated/updated file and fill in the TODO placeholders.**

## Research the Vendor API Before Writing Any Code

Do this **before** writing schemas or handlers, not after. Every action that mutates data or requires a
specific auth scope has a real, documented API behavior — do not assume REST conventions apply. For each
action you plan to implement, find the vendor's official API reference and confirm:

- **Update semantics**: does the endpoint support partial updates (`PATCH`, or a `PUT` that merges), or
  does it fully replace the resource (a `PUT` that 400s if you omit any required field)? If it's
  replace-only, the handler must `GET` the current resource first and backfill every field the input
  didn't provide — not just the fields you happened to test.
- **Nested objects sent whole**: the same applies one level down. Many "set X config" endpoints take a
  whole sub-object (`masterAuthorizedNetworksConfig`, `management`, `autoscaling`) and reset any field
  you omit inside it to its default. List every field of the vendor's type for that sub-object, and for
  each one decide whether the input sets it or the handler copies it from the current resource. The GKE
  connector copied `gcpPublicCidrsAccessEnabled` but not `privateEndpointEnforcementEnabled`, so
  changing the CIDR allowlist silently removed the private-endpoint restriction.
- **HTTP method and body shape per route**: take both from the vendor's OpenAPI/swagger or REST
  reference for *that exact route*, never by analogy with a neighbouring endpoint. The AKS connector sent
  `PATCH` to an agent-pool route that only supports `GET`/`PUT`/`DELETE` (ARM answered with a misleading
  `InvalidAPIVersion`), and wrapped the `runCommand` body in `properties` like the resource bodies around
  it, while `RunCommandRequest` is flat. Both failed on every real call and passed every mocked test.
- **Array/list query parameters**: how does the API expect repeated values encoded — `?id=1&id=2`,
  `?id[]=1&id[]=2`, or a comma-joined string? Axios's default array serialization (`id[]=1&id[]=2`) is
  not universal; check the docs and, if needed, set a custom `paramsSerializer`.
- **Query string vs. request body for optional modifier params**: for a `POST`/`PATCH` action whose only
  required input is a path segment (an ID) but that also accepts optional modifiers (`scope`, `filters`,
  `all_X` flags, an expiry timestamp), check the vendor's docs for whether those modifiers are read from
  the query string or the JSON body — do not assume, and do not infer it from a similar sibling action in
  the same file. Two actions that look like a natural pair (e.g. a resource's mute/unmute, or enable/
  disable) can each independently get this wrong; comparing them to each other won't surface the mistake
  if both share it. A wrong transport here doesn't error — the vendor accepts the request and silently
  ignores the misplaced param, so the bug only shows up if a test or live-testing pass actually sets that
  optional param to a non-default value.
  - **Verify against the vendor's own docs page, not a derived source.** A vendor's official client
    library's internal request-building code, or a third-party/community OpenAPI mirror, is not sufficient
    evidence on its own for this specific question — both can encode the same wrong assumption the handler
    does, or be independently wrong, and neither will tell you so. Find the actual parameter table on the
    vendor's own API reference page for that endpoint (look for an explicit "Query String(s)" vs. "Request
    Body"/"Body Data" heading) and treat that as authoritative over anything else. If the live docs page is
    a heavy client-rendered SPA that a scraping/fetch tool can't render properly (parameter tables missing
    from the extracted text), don't fall back to a lower-confidence secondary source — try an archived
    static snapshot of the same page (e.g. via the Wayback Machine) or, if still unresolved, live-test the
    specific optional param against a real account before merging. Getting this backwards is easy to miss
    because the "fixed" code still looks more correct than the original — it changed something on purpose,
    based on evidence that seemed reasonable — so a subsequent reviewer has to independently re-derive the
    right answer rather than just trusting that a change already went through this reasoning correctly.
- **Per-action auth scopes**: list every scope/permission each action actually requires (not just the
  minimum to authenticate), especially for destructive or admin actions (delete, bulk update) or actions
  that hit a different API sub-resource (e.g. an alert/rule endpoint vs. the main resource). Once you have
  the full list, write it into **every** place a user might see it — the auth field's `helpText`, the docs
  page's "Authentication" summary line, and the docs page's "Get API credentials" setup steps — and use the
  exact same scope names in all three. Writing it correctly in only one of these is the same bug as not
  documenting it at all: a user creating the connector sees the in-product `helpText`, not the docs, so an
  extra scope that's only in the docs' setup steps still produces a 403 for anyone who follows the in-UI
  hint.
  - **Cloud roles have a scope level as well as a name.** For Azure RBAC, GCP IAM, and AWS IAM, write down
    *where* each role must be granted (subscription, resource group, project, or a single resource), not
    just which role. The AKS docs granted a role on each cluster, but `listResourceGroups` calls a
    subscription-level route, so a user following the setup steps got a 403 on the first discovery step.
    Also list roles needed on *other* resources (GKE's `iam.serviceAccountUser` on the node service
    account for `createCluster`).
- **Regional/self-hosted variants**: does the service run on multiple regional domains (e.g.
  `us.example.com`, `eu.example.com`) in addition to a default SaaS host, or support self-hosting? If so,
  the base-URL config field's help text must say so — otherwise requests silently 404 for a subset of users.
- **Accepted value formats for "assign to" / "who" style fields**: don't assume convenience shorthands
  (like `"me"`) are valid API values just because they're common search-filter syntax — verify against
  the docs for the specific write endpoint you're calling.
- **Structured field shapes (labels, tags, custom fields, metadata)**: don't default a field like `labels`
  or `customFields` to `z.string()` (e.g. a comma-separated list) just because that's a common convention
  elsewhere — check the vendor's actual example request body. Many APIs expect a JSON object/map (e.g.
  `{"team": "backend", "priority": "high"}`) or an array of objects, not a delimited string, and will 500
  or silently misparse a string sent where an object is expected.
- **Identifier formats, per field**: take each identifier's allowed format from the vendor's docs for
  that specific field, including fully qualified and cross-project forms. Do not reuse one regex helper
  across fields with different rules. The GKE connector validated Kubernetes node labels with the GCP
  resource-label regex, which rejects `example.com/workload`, and accepted only bare network names, which
  rejects the `projects/host/global/networks/shared` form Shared VPC needs.
- **Resource variants and modes**: list the variants the vendor documents for each resource (GKE
  Standard vs. Autopilot, clusters with only a DNS endpoint; AKS System vs. User node pools; regional vs.
  zonal) and note which fields are absent or which operations are rejected for each. The AKS connector
  allowed scaling any pool to 0, which AKS rejects for System pools. Check variant-specific constraints
  in the handler before sending the request, and add a test fixture per variant.
- **Compound-document / sideloading conventions**: if the vendor's response envelope follows JSON:API
  (`data`/`attributes`/`relationships`/`included`) or a similar sparse-fieldset pattern, check whether
  related objects are populated by default or require an explicit param (e.g. `?include=services,groups`,
  GraphQL field selection). If required and omitted, relationship fields the output schema promises will
  come back `null`/empty even though the API call itself succeeds with a 200 — this is easy to miss because
  nothing errors, the data is just quietly missing.

Cross-reference this research against the fields you're about to add `.describe()` text for — the
description should state the *verified* format/constraint, not an assumed one.

### Verify GraphQL Schemas via Introspection

If the vendor's API is GraphQL (NerdGraph, a custom GraphQL backend, etc.), do **not** trust a docs example,
a blog post, or general familiarity with the vendor to get input type names, field selections, and
enum/mutation argument shapes right — even docs pages sometimes show inconsistent or outdated examples, and
it's easy to write a plausible-sounding type name (e.g. guessing an `XyzFilterInput`/`XyzTimeWindowInput`
suffix pattern, or assuming a field exists on a response type because a similar field exists elsewhere)
that simply doesn't exist in the real schema. This class of bug compiles fine and passes unit tests that
mock the HTTP client, then fails with `Unknown type "..."` or `Cannot query field "..." on type "..."` the
first time a real request hits the live API — a `build-connector` chat test or manual verification pass is
usually the first time anyone would catch it.

Before finalizing any query/mutation string, verify every referenced type and field against the schema
itself using standard GraphQL introspection (`__schema`, `__type`), run through the connector's own
authenticated client so you're checking against the exact account/schema version you'll actually call:

1. Find the root query/mutation type name if you don't already know it:
   ```graphql
   { __schema { queryType { name } mutationType { name } } }
   ```
   (Don't assume it's literally `Query`/`Mutation` — some APIs name these differently, e.g. NerdGraph's
   mutation root is `RootMutationType`.)
2. List a root type's fields and their argument/return types to confirm a query or mutation exists with the
   name and shape you expect:
   ```graphql
   { __type(name: "RootMutationType") { fields { name args { name type { name kind ofType { name kind } } } type { name kind ofType { name kind } } } } }
   ```
3. Drill into a specific input or output type's fields before relying on them:
   ```graphql
   { __type(name: "SomeFilterInput") { inputFields { name type { name kind ofType { name kind } } } } }
   { __type(name: "SomeResponseType") { fields { name type { name kind ofType { name kind } } } } }
   ```

The simplest way to run these during development: temporarily add a throwaway action to the connector spec
(e.g. `debugIntrospect`, `isTool: false`) whose handler sends one of the queries above through the same
`graphqlRequest`/client helper the real actions use, call it once Kibana has hot-reloaded via the Actions
`_execute` API, read the result, then **delete the debug action before committing** — it must never ship.
Repeat for each type/field you're unsure about; each round only needs a single narrow query, so this is
fast even across several iterations.

Do this proactively for every hardcoded query/mutation string before live-testing, not only after a request
fails — the cost of one introspection round-trip is far lower than a failed live test plus a fix-and-retest
cycle.

## Implement the Connector Spec

Fill in the generated spec stub with actions, handlers, auth config, and tests. Additionally, create a `types.ts` file alongside the spec for input schemas and types.

### Auth Type Selection

The most common auth types:

- `'bearer'` — for services where the user provides a pre-obtained OAuth access token or API token (e.g., Google APIs, Notion, GitHub). Simplest option.
- `'api_key_header'` — for services that use API key authentication via a custom header.
- `'api_key_query'` — for services that take the API key as a query parameter.
- `'basic'` — for services that use HTTP basic authentication (username and password).
- `'oauth_client_credentials'` — for services that use OAuth 2.0 Client Credentials flow (e.g., Microsoft/Azure services like SharePoint). Requires multi-field credential input (clientId, clientSecret, tenantId).
- `'oauth_authorization_code'` — for services where each user signs in through an OAuth 2.0 authorization code flow (e.g., Google Drive, Salesforce, Figma, Zoom).

Cloud-specific auth types (`aws_credentials`, `gcp_service_account`, `azure_shared_key`), certificate
auth, and the others live in `src/platform/packages/shared/kbn-connector-specs/src/auth_types/`; check
there before writing a custom token exchange. To configure the OAuth form, see "OAuth Auth
Configuration" in [connector-patterns.md](connector-patterns.md#oauth-auth-configuration).

### Input Schemas & Types

Define Zod schemas and inferred types in a separate `types.ts` file alongside the connector spec. See [connector-patterns.md](connector-patterns.md) for the full pattern.

### SubActions

- Create subActions for the operations an agent needs to complete the connector's use cases (search,
  list, get, download, and any create/update actions in scope)
- Prefer one generic action over several near-duplicates (one `search` with filters rather than
  `searchOpen` and `searchClosed`), and skip vendor endpoints no agent use case needs. Each action is a
  tool an agent must choose between, and each one adds review and test surface

### Connector ID Naming

- All connector IDs MUST start with a leading dot (e.g., `.servicenow`, `.notion`, `.github`)
- Before choosing an ID, search for existing connectors: `grep -r "id: '.servicenow'" --include="*.ts"`
- If a connector with that ID already exists, use a unique variant (like `.servicenow_search`)
- The ID must be unique across all connectors in the codebase

### Simplify the Configuration UI

1. **Schema config fields MUST have `.meta()` with a `label`** — Without a label, the field renders as an unlabeled input.
2. **Set sensible OAuth defaults** — Use the `defaults` object to pre-populate fields like `tokenUrl`.
3. **Hide the `scope` field** — Use `overrides.meta` to hide it: `scope: { hidden: true }`.
4. **Add a `placeholder` to `tokenUrl`** — Even with a default value, add a placeholder via `overrides.meta`.

See [connector-patterns.md](connector-patterns.md) for the full OAuth configuration pattern.

### Enable the Test Connector Button

The generated `test` block includes `enabled: true` — **do not remove it**. `ConnectorTest.enabled`
defaults to `false`, so a `test` block without this flag compiles fine and passes type-checking, but the
"Test connector" button stays disabled in the Kibana UI even though a handler is defined. This is easy to
miss because nothing fails until a human clicks the button.

### Avoid ICU-Unsafe Characters in Translated Help Text

Do not write a literal `<placeholder>` in any string passed through `i18n.translate()`; it throws at
runtime. See the ICU note under "Schema UI Configuration" in
[connector-patterns.md](connector-patterns.md#schema-ui-configuration).

## Write LLM-Quality Descriptions and Skill Content

Follow Step 3 of [SKILL.md](../SKILL.md) and the "LLM-Quality Descriptions and Skill Content" section of
[connector-patterns.md](connector-patterns.md#llm-quality-descriptions-and-skill-content), which cover
action `description`s, parameter `.describe()` text, input bounds, and the `skill` property.

## Complete the Documentation

The generated documentation file at `docs/reference/connectors-kibana/<kebab-name>-action-type.md` contains TODO placeholders. Fill in:

1. **Connector configuration section** — Describe the credential the user needs to provide.
2. **Actions section** — Document each action with its parameters, types, and descriptions.
3. **Get API credentials section** — Step-by-step instructions for obtaining the credential.

Also update the snippet description in `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md` — the generator inserts a `TODO: Add brief description.` placeholder that must be replaced with a real, capability-focused description (see the [`metadata.description` quality rules](connector-patterns.md#metadatadescription-quality)).

See existing docs (e.g., `google-drive-action-type.md`) for the expected style.

## ID Alignment

Follow the [ID alignment rules in connector-patterns.md](connector-patterns.md#critical-id-alignment).
