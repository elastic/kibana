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

Start with the deterministic checks and report every failure for the connector under review:

```bash
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/connector_spec_quality_contract.test.ts
node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/connector_spec_vendor_api_contract.test.ts
```

They cover the docs page location, the availability statement and workflow claims on the docs page,
internal wording in the docs page,
navigation links, action and parameter descriptions, and `.max()` bounds on input strings and arrays.
The vendor API contract test covers whether the connector's `vendor_api/` artifacts are current, and
whether any action sends a request its vendor spec rejects, including at every schema bound and enum value.
The checklist below is for what a test cannot judge: whether those descriptions and limits are *right*,
and whether the vendor API artifacts are trustworthy.

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
- **`supportedFeatureIds` on a brand-new connector type**: A new connector must reach Production-NonCanary
  before it can declare user-facing features, otherwise a rollout or rollback can leave a node without the
  type and break any user action referencing it. A PR that adds a connector may only declare
  `['agentBuilder']`. Flag `'workflows'` or any other user-facing feature ID on a newly added
  connector and ask for it to move to a follow-up PR. A PR that adds feature IDs to an existing connector
  is fine as long as that connector is already registered in every Production-NonCanary version.
- **Schema UI**: Every config field in `schema` has `.meta()` with at least `label` (or uses a `UISchemas.*` helper).
  Otherwise fields render as unlabeled.
- **Config fields without a widget**: Flag a `z.boolean()`, `z.array()`, or `z.record()` field in the
  connector-level `config` `schema` with no explicit `widget` in `.meta()`. The form-generator's widget
  registry has no default widget for those types, so this throws `No widget found for schema type: ...`
  when a human opens the connector creation form — a runtime-only error that passes type-check, lint,
  and mocked unit tests cleanly. Numeric fields are fine (the number widget renders them; MySQL's `port`
  is the precedent), so do not ask for a number to be turned into a regex-validated string. This does not
  apply to action `input` schemas (never rendered as a form).
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

  For cloud connectors (Azure RBAC, GCP IAM, AWS IAM), check the *level* each role is granted at as well
  as its name. Map every action to the route it calls: a subscription- or project-level route (listing
  resource groups, listing projects) needs a role at that level, not only on the target resource. The
  AKS docs granted a cluster-scoped role, and the documented discovery flow 403'd on its first step.
- **Auth-type branching reads `ctx.secrets`**: Flag `ctx.config.authType`. The executor puts the auth
  discriminator in `ctx.secrets.authType` (`slack.ts` is the precedent), so a `config` check is always
  false. Check the test too: a test that puts `authType` in `config` passes while the real branch is dead,
  which is how this shipped in the Bitbucket connector.
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
- **Spec file size**: `{connector}.ts` should stay under 500 lines; flag it above 500 and treat it as a
  blocker above 1000. Look for what to move out: request plumbing (auth headers, error mapping,
  pagination and polling loops), response shaping, credential exchanges, and code repeated across
  handlers. Each moved file needs its own test file. See `gmail/mime.ts` and
  `azure_monitor/azure_ad_token.ts` for the pattern.
- **`lazySchema()` wrapping**: Every Zod schema assigned to a variable must be wrapped with
  `lazySchema(() => ...)` from `@kbn/zod/v4`. That means the input schemas in `types.ts`, and also
  module-level helpers in any file, such as
  `const IpAddressSchema = lazySchema(() => z.union([z.ipv4(), z.ipv6()]));`. The spec's `schema` and
  every inline action `input` are wrapped the same way. A bare `z.…` at module level is built eagerly at
  import, which is a runtime behavior difference, not just style. Flag any unwrapped schema.
- **`callToolJson` vs `callToolContent`** (MCP connectors): Typed data actions (search, list, get) must
  use `callToolJson(ctx, 'tool_name', args)`. File download or binary actions must use
  `callToolContent(ctx, 'tool_name', args)`. Using `callToolJson` on a binary response corrupts data;
  using `callToolContent` on a JSON response forces callers to parse raw content. Flag any mismatch.

### Vendor API Artifacts

The contract test only checks the connector against what `vendor_api/` says the vendor accepts. Every
correction in that folder relaxes or reshapes the check, so review each one as you would a code change.
See "Vendor API artifacts" in the package README for the formats.

- **Source choice** (`manifest.json` `sources`): each URL is the vendor's own spec, from its docs host or
  its own repository, not a community mirror or a copy committed elsewhere; and it describes the API
  version the connector calls (compare `apiVersion` and the server URLs with the connector's base URL).
  A connector calling two API versions or products has a source per spec. For Google APIs, the source is
  the Discovery document (`…/$discovery/rest?version=v1`).
- **Exemptions** (`vendor_api_exemptions.json`): only a connector added in this PR may get one, and the
  reason must name why no spec can be recorded (no public spec, a database wire protocol, an MCP server).
  "Artifacts not recorded yet" is not a reason for a new connector.
- **Overlay actions** (`overlay.yaml`): each action has a `description` with its evidence, a docs URL and
  what it says, or what the real API did during live testing. Flag an action without one. Be most
  skeptical of actions that *loosen* the spec (remove a `maxLength` or `enum`, make a required field
  optional, widen a type, add a parameter): that is exactly what makes a connector bug pass the contract
  test. Prefer narrow targets (one path and method) over wildcards like `$.paths.*.*` unless the evidence
  covers every operation.
- **Unmatched requests** (`manifest.json` `unmatched`): each `reason` links the vendor's docs for the
  endpoint, or a follow-up issue. Check the request isn't a connector bug (a typo in the path, a wrong API
  version prefix): compare it with the vendor's docs. If the docs document the endpoint, an overlay action
  adding it is better than an `unmatched` entry, as the contract test then checks the request too.
- **Pagination** (`manifest.json` `pagination`): for each descriptor, check the vendor's docs for the page
  selector parameter, the page size parameter, where the next cursor or link sits and what marks the
  last page. The contract mock pages according to the descriptor, so a wrong one hides a pagination bug.
  `"none"` needs the docs to say the operation returns everything at once. The `## Validated` section
  should say page 2 was fetched for each paging list action.
- **Fixtures** (`fixtures.json`): every `queries` entry claims an operation changes no vendor state; check
  the vendor's docs agree, or the `read` scope is wrong. `input` and `responses` should only supply what
  generated values can't, such as an ID in the vendor's format.
- **Schema bounds**: a `.max()` tightened to make the contract test pass should match the vendor's
  documented limit, and the action's `.describe()` text should state the same limit.
- **Snapshot and manifest diffs**: on a PR that changes the connector, operations added to or removed
  from `manifest.json` should match the handler changes. A snapshot diff means the vendor's spec changed
  (`--refresh`); check whether the connector needs to follow.

### Vendor API Correctness

These are easy to write incorrectly by assuming generic REST conventions instead of checking the vendor's
actual documented behavior — flag them even without live access to the API, based on what the code assumes:

- **Partial vs. full-replace updates**: If an update action sends only the fields present in its input,
  check whether the underlying endpoint is a `PATCH`/merge or a `PUT`/full-replace. A `PUT` handler that
  doesn't first `GET` the current resource and backfill omitted fields will silently drop or reject
  partial updates. This is easy to miss in review because the code "looks like" a normal partial update.
- **Nested objects replaced whole**: Apply the same check one level down. For every sub-object a handler
  sends to a "set X config" endpoint, open the vendor's type for it (often already in `types.ts` as a
  response type) and compare its fields with the ones the handler sends. Flag any field the input does not
  set and the handler does not copy from the current resource. The GKE `setMasterAuthorizedNetworks`
  shipped copying one flag and dropping `privateEndpointEnforcementEnabled`, which silently disabled a
  security restriction.
- **Method and body shape copied from a neighbouring route**: Check each mutating action's HTTP method and
  body envelope against the vendor's OpenAPI/swagger entry for that route. Flag a body wrapped the same way
  as the resources around it (a `properties` envelope) or a `PATCH` where the route lists none, unless the
  `## Validated` table shows that action succeeding *through the connector*. Both AKS mutations shipped
  this way and failed on every real call.
- **Array query-parameter serialization**: If an action sends an array as query params (e.g. a list of
  IDs), check whether the code special-cases the serialization (e.g. a custom `paramsSerializer`) or
  relies on the HTTP client's default. A vendor expecting the repeated-key form (`?id=1&id=2`) will reject
  the client library's default bracketed form (`?id[]=1&id[]=2]`), or vice versa — this doesn't show up in
  unit tests that mock the client.
- **Query params vs. request body for optional modifier params**: If a `POST`/`PATCH` action's only
  required input is a path segment (an ID) but it also accepts optional modifiers (`scope`, filters,
  `all_X` flags, an expiry timestamp), verify against the vendor's docs whether those modifiers belong in
  the query string or the JSON body — check each action independently, don't infer it from a similar
  sibling action in the same file (e.g. a resource's mute/unmute, or enable/disable). Both halves of such a
  pair can share the same wrong assumption, so contrasting them against each other won't reveal the bug;
  only the vendor's own request example will. This doesn't throw — the vendor accepts the request and
  silently ignores the misplaced param — so it won't show up in a test or live-testing pass unless the
  optional param is actually set to a non-default value; flag it as unverified if the only tests/live runs
  exercise the required-fields-only path. If the diff's commit history shows this was *already* "fixed"
  once (moved from query to body or vice versa), don't treat that as settled — re-derive the answer from
  the vendor's actual docs page yourself. A prior fix based on a client library's internal code or a
  third-party OpenAPI mirror can be confidently wrong; those aren't a substitute for the vendor's own
  parameter table (look for an explicit "Query String(s)" vs. "Request Body" heading on the vendor's own
  endpoint reference page).
- **Credential in a custom header + automatic redirects**: Flag any handler that sends a credential in a
  vendor-specific header (`x-api-key`, `x-functions-key`, `private-token`, etc.) without
  `maxRedirects: 0`. Axios follows redirects by default and strips only the *standard* authorization
  headers on a cross-host redirect, so a service that answers with an auth redirect forwards a live
  credential to the target host. This is a credential-leak path, not a robustness nit — treat it as high
  severity. No test that mocks the HTTP client will surface it. The 3xx should come back as a result with
  its `Location` intact, which needs a `validateStatus` accepting 3xx *as well* — `maxRedirects: 0` alone
  leaves Axios's default `validateStatus` to reject it, so the handler throws and the caller never sees
  the `Location`. `jenkins.ts` sets both and is the in-repo precedent.
- **Non-2xx responses swallowed as exceptions**: Axios rejects every non-2xx status, so an action that
  proxies a call to caller-controlled code or a caller-named route takes the `catch` path when the service
  deliberately answers `400`, `409`, or `500`. The caller then gets a connector error instead of the
  status, headers, and error body it needs. Flag any such action with no `validateStatus` predicate.
- **A status code used as the sole evidence for a classification**: Applies **only to an action that
  already proxies meaningful non-2xx answers** — the action in the row above, whose contract is to hand
  the caller whatever the service said. Within such an action, flag a `validateStatus` predicate (or
  `catch` branch) that excludes specific statuses on the grounds of what they "mean" — typically 401/403
  treated as a bad credential. A service whose own code enforces user authorization returns those
  statuses too, and the status alone cannot distinguish the two, so the service's intended authorization
  response becomes unreadable. Inside that action every HTTP status should be returned as a result; only
  transport failures, which carry no status, are exceptions.

  Do not apply this rule to any other action. An ordinary `GET` that 401s has failed, and a connectivity
  `test` handler whose authentication fails **must** fail — its whole purpose is to report whether the
  credential works, so returning a 401 as a successful result reports a broken connector as healthy.
  Flag the reverse there: a `test` handler or plain read with a `validateStatus` that accepts 401/403.
- **Unfollowed pagination continuation links**: Flag any list action that returns
  `response.data.value`/`.items`/`.results` without following the vendor's continuation field
  (`nextLink`, `next`, `next_cursor`, a `Link` header). A partial inventory presented as complete is worse
  for an agent than an error. Check every list action *and* the connectivity `test` handler if it reports
  a count. Where a helper exists, confirm it caps the page count and reports the cap in the result (e.g.
  `truncated: true`), and that it preserves the continuation URL's own query string rather than
  re-applying `params` — that corrupts a URL already carrying an api-version and a skip token.

  Check first which kind of continuation the vendor returns, because the two are handled oppositely. A
  URL continuation (`nextLink`, `next`, a `Link` header) is resolved and requested, with the caller's
  `params` dropped. An opaque cursor token (`next_cursor`, `nextPageToken`) is re-sent as the parameter
  the vendor names, *with* the original `params`, since the filters are not encoded in the token. Flag a
  helper that passes a cursor token to `new URL()` —   a token has no path, so it resolves to a sibling
  endpoint the connector never called, and the list stops after the first page.

  Then compare the list actions with each other. Flag any list action that can return `hasMore: true`
  with no page or cursor input, when a sibling in the same file has one. Before flagging the continuation
  *kind* as wrong, check whether the PR records a live `next` value for that endpoint: a vendor can
  document cursor pagination and serve page numbers (a Libra finding on Bitbucket `listRepositories`
  was rejected on exactly this basis).
- **A cross-host continuation link followed with the authenticated client**: Treat this as high severity.
  A vendor-supplied `nextLink` is caller-untrusted data, and `ctx.client` carries the connector's
  credentials. Axios strips a standard authorization header on a cross-host *redirect*, but an explicit
  new request gets no such protection, so an attacker-influenced link sends the credentials to the host
  it names and can reach an internal address. Flag any pagination helper that passes a continuation URL
  to `ctx.client` with no origin check against the request it sent (or an explicitly allowed host).
  Check how the link is parsed, too: a bare `new URL(nextLink)` throws on the relative link (`?page=2`,
  `/items?page=2`) a `Link` header commonly carries, so it stops pagination at page one for those
  vendors. The helper should resolve the link against the request URL and use the resolved URL for the
  next request, which handles both forms and still compares the right origin.

  Then check *which* base it resolves against. `new URL(url, baseURL)` is not the URL Axios requested:
  Axios concatenates `baseURL` and `url` rather than resolving them, so a `baseURL` with a path
  (`https://api.example/v1`) plus `url: '/items'` is requested as `/v1/items` but resolves as `/items`.
  A relative continuation link measured against that base paginates at an endpoint the connector never
  called, and returns nothing or the wrong collection without erroring. `ctx.client.getUri({ url,
  params })` returns the effective URL and is the correct base.
- **Any other URL the connector did not build, requested with the authenticated client**: The rule above
  is not specific to pagination; treat every instance as high severity. Search the handlers for
  `ctx.client.get(`/`.request(` whose URL comes from a response header (`Location`,
  `Azure-AsyncOperation`, `Operation-Location`), a response body (`selfLink`, an operation URL), or the
  caller's input. The AKS `runCommand` poller followed `Location` with the OAuth client unchecked. For a
  URL the *caller* supplies (a `nextCursor` handed back as input), an origin check is not enough: flag it
  unless the path is also restricted to this action's endpoint for the configured tenant and requested
  resource. The Bitbucket cursor passed a host check while naming another workspace's repository.
- **Poll and retry loops that swallow permanent errors**: Flag a poll or retry loop that catches every
  error. Only transient statuses (a short-lived 404 while an operation is created, 429, 5xx) should be
  retried; 400/401/403 should surface at once with the vendor's message rather than as a timeout. Flag
  a friendly error branch that gives 401 (credential rejected) and 403 (credential lacks a permission) the
  same explanation.
- **Identifier patterns reused across fields**: Flag a single regex helper applied to identifier fields
  whose vendor formats differ (GCP resource labels vs. Kubernetes node labels), and an identifier pattern
  that rejects the vendor's fully qualified or cross-project form (a Shared VPC
  `projects/<host>/global/networks/<name>` reference).
- **Resource variants**: Where the vendor documents variants of a resource (Autopilot vs. Standard,
  DNS-only clusters, System vs. User pools), check that output mapping handles the fields each variant
  lacks and that variant-specific constraints (a System pool cannot scale to 0) are checked or described.
  Flag a derived output block gated on one of several alternative fields.
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
- **Structured field types (objects vs. delimited strings)**: Flag any `z.string()` input for a field
  vendors commonly model as a key-value map or array — `labels`, `tags`, `customFields`, `metadata`.
  Check the vendor's actual example request body rather than assuming a comma-separated-string convention;
  sending a string where the API expects a JSON object typically produces a 500 or a silently-ignored field.
- **JSON:API / compound-document relationships**: If the vendor's response envelope uses a JSON:API-style
  `data`/`attributes`/`relationships`/`included` shape (or a similar sparse-fieldset/GraphQL selection
  convention), check that handlers request the param needed to sideload any relationship the output schema
  promises (e.g. `?include=services,groups`). Without it, those fields come back `null`/empty on a
  successful 200 response — flag any handler returning a "flattened" relationship field with no
  corresponding `include`/field-selection param in the request.
- **Hardcoded GraphQL type/field names not verified against the real schema**: For any GraphQL-backed
  connector (queries/mutations built as string templates), every input type name (`$filter: SomeInput`),
  field selection, and return-type field must be checked against the vendor's *actual* schema, not just
  a docs example or general familiarity with the vendor. Vendor docs pages frequently show simplified,
  inconsistent, or outdated examples, and it's easy to write a plausible-sounding but nonexistent type
  name (e.g. inventing an `XyzFilterInput` suffix, or assuming a field like `routingKey` exists on a
  response type because it "sounds right"). These errors compile and pass mocked unit tests cleanly —
  they only surface as `Unknown type "..."` or `Cannot query field "..." on type "..."` errors when a real
  request hits the live API, so a code-only review can't catch them by inspection alone. If live testing
  hasn't run yet, flag every GraphQL type/field name in the diff as unverified and recommend confirming it
  via schema introspection (see `create-connector/reference/custom-connector-setup.md`'s "Verify GraphQL
  Schemas via Introspection" section) before merging. If live testing already ran, confirm the PR
  description's `## Validated` table calls out which query/mutation shapes were actually schema-verified.

### LLM Descriptions and Skill Content

- **`scope` classified from the action name instead of the documented side effect**: Every `isTool: true`
  action needs an explicit `scope`, and it must reflect what the request does to the service. `scope` is
  the signal an orchestration layer uses to decide whether an action is safe during read-only
  exploration, so a mutating operation marked `read` is the worst case.

  A read-sounding name is not evidence of a read: `listSyncFunctionTriggers` is a `POST` that
  re-synchronizes an app's deployed trigger metadata, and shipped as `scope: 'read'`.

  A `POST` is not evidence of a mutation either. A GraphQL query, a search route with a body, and a
  bulk-read endpoint are all read-only `POST`s, and many shipped specs correctly pair `scope: 'read'`
  with one. Relabelling those `destroy` would hide safe queries from read-only exploration — the
  opposite failure.

  So treat a `scope: 'read'` on a `POST`/`PUT`/`PATCH` as a prompt to check the vendor's documented
  behaviour for that route, and flag it only when the documentation says the call changes state.

  The same applies between `write` and `destroy`. A `create`/`set` action that writes under a
  caller-chosen key and replaces any existing value there is an overwrite: Bitbucket's
  `createCommitBuildStatus` can replace a failing status with a passing one under the same key. Flag it
  when marked `write`.
- **`skill` recipes that the actions cannot perform**: For each step of each pattern in `skill`, find the
  action it names and the output field it reads. Flag a step whose action does not return that field. The
  Bitbucket merge recipe said to check statuses via `getPullRequest`, which has no status fields.
- **States with no way out**: For every state an action can put a resource into (draft, stopped, paused,
  locked), check that another action leaves it, or that `skill` says the vendor UI is needed. The
  Bitbucket connector could open a draft pull request that none of its actions could make mergeable.
- **A disproven vendor behaviour fixed in only one place**: When the diff (or its commit history) shows
  that live testing disproved a documented response shape, check that *every* place encoding the old
  assumption was corrected — the action `description`, the `scope`, the test mock, the auth `helpText`,
  the `skill` text, and the docs page. A description rewritten alone, with the scope and mock left behind,
  has shipped before. Grep the connector directory and its docs page for the disproven claim.
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

- Generator scaffold docs are filled in (no remaining `TODO:` placeholders in docs **or** source files)
- **Snippets file**: Third-party data connectors (cloud storage, SaaS search, etc.) belong in
  `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md`, **not**
  `elastic-connectors-list.md` (which is reserved for Kibana-native connectors like Cases, Index,
  ServerLog, and Obs AI Assistant). Order them alphabetically. Flag any third-party connector 
  entry added to the wrong file.
- **`toc.yml` placement**: Third-party connectors belong under the `data-context-sources-connectors.md`
  node, **not** `elastic-connectors.md`. Flag any third-party connector whose `toc.yml` entry is a
  child of `elastic-connectors.md`.
- **Doc frontmatter version**: `applies_to.stack` must include a version number — `stack: preview X.Y`,
  not just `stack: preview`. The version must be ≥ every other version referenced anywhere in the doc
  (a new connector cannot have been available before any feature it references). Flag any doc where it
  is missing or where the version is lower than another version referenced in the same file.
- **Stated availability must match `supportedFeatureIds`**: A doc page for a connector shipping
  `supportedFeatureIds: ['agentBuilder']` must say so — recent connector pages state what the connector
  can be used with, because it is common for one to work with only Agent Builder or only Workflows. Flag a
  page that promises workflow support the spec does not declare, including in the opening sentence ("a
  workflow or agent can..."). `gitlab-action-type.md` carries the expected note.
  An `isTool: false` action on such a connector is reachable only through the `_execute` API; flag a
  page that presents it as a workflow step or agent capability — it should be marked
  `_(not yet available)_`, as in `databricks-action-type.md`. The contract test checks the availability
  statement and the common workflow phrases; read the rest of the page for claims it cannot match.
- **Shared files carrying another connector's entries**: Diff `toc.yml`, the connector-list snippet,
  `all_specs.ts`, `connector_icons_map.ts`, and `CODEOWNERS`. Flag any added line that does not refer to
  this connector, and any link to a file that does not exist in the branch. The AKS PR added a dangling
  Azure DevOps entry to both docs files.
- **Internal vocabulary in a user-facing page**: Flag "custom connector", "MCP-native", "connector spec",
  "stack connector" and similar. These describe our implementation, not anything a reader can act on — a
  reader cannot tell what a *non*-custom connector would be. The page should say what the connector does.
- **A paragraph interrupting a Markdown table**: A note inserted between two rows terminates the table,
  and every row after it renders as raw pipe-delimited text with no header of its own. Flag any prose
  between table rows; a note about one action belongs below the final row. Count the rows against the
  number of actions the spec exposes to confirm the table is contiguous.
- `docs/reference/toc.yml` entry exists in the correct section and matches alphabetical order in that section.
- **Icon**: Connector has an icon (ConnectorIconsMap entry and icon component or asset). The SVG
  must be the vendor's official brand mark — sourced from the vendor's press kit, brand guidelines
  site, or a curated icon set like [Simple Icons](https://simpleicons.org/) (which tracks official
  sources). Flag SVGs that look AI-generated or hand-drawn: telltale signs are polygon-based
  approximations, inline comments describing the shape (e.g. `<!-- Top triangle -->`), non-standard
  brand colors, or a viewBox that doesn't match the vendor's standard. If a genuine brand icon is
  not yet available, prompt the user to obtain one from the vendor — do not accept a generated
  placeholder.

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
  A `✅ Pass` must come from a call made *through the connector* (`_execute`, or an agent calling the
  tool). Flag a row whose scenario describes calling the vendor API directly (`curl`, the vendor CLI, a
  REST client): the original AKS PR marked `runCommand` as passing on that basis while the connector sent
  a body Azure rejected on every call.
  The section should also report the vendor API contract: the sources and API versions recorded
  against, the contract test result, and each overlay action and `unmatched` entry with its evidence.
  Flag a PR that adds `vendor_api/` corrections without listing them there.
- **Labels**: The PR must have both `release_note:feature` and `Feature:Actions/ConnectorTypes` applied
  (check with `gh pr view <number> --json labels`). Flag if either is missing.

### Naming and Conventions

- Directory and file names follow repo conventions (snake_case for dirs/files; camelCase for TS exports)
- Connector IDs don't collide with existing ones. If a connector already exists for the same product, use
  a distinct ID (e.g. `.servicenow_search`)
- **CODEOWNERS section**: The connector's entry must appear in `# Connector Specs`, inserted
  alphabetically among the other `src/platform/packages/shared/kbn-connector-specs/src/specs/**`
  lines, not in `# Connector Agent Skills` or any other section. Flag misplacement.
- If the PR changes behavior that could affect existing callers, document why and address backwards compatibility in
  the PR description
- **TypeScript** (touched files): Use strict equality (`===` / `!==`), follow repo style (early returns, explicit
  types, no `any`)
- **Lint**: Run `node scripts/eslint <touched files>` and treat any reported error as a must-fix. This is
  fast, requires no running Kibana/Elasticsearch, and catches mechanical rule violations (e.g. a forbidden
  non-null assertion, `@typescript-eslint/no-non-null-assertion`, in a freshly-written test file) that a
  manual reading pass can miss and that would otherwise only surface once CI's lint step fails.
- **Dead code from iteration**: Flag schemas, types, or constants that are defined but never referenced —
  common leftovers from an earlier design that was later simplified.
- **Duplicated calls**: Flag a helper (e.g. a URL builder) called more than once within the same handler
  when the result could be computed once into a local variable.

### Tests

- **Test file mock pattern**: The test file must mock `withMcpClient` (for MCP connectors) with both
  `mockCallTool` and `mockListTools` so handlers do not require a real MCP transport. The mock should
  route through `withMcpClient` so that `callToolJson`/`callToolContent` calls are also captured.
  Flag test files that skip this mock, instantiate a real MCP client, or leave handlers untested.
- **Stale mocks and tests that assert nothing**: Flag a mock whose response shape contradicts what the
  handler or its description now claims — typically left behind when live testing disproved a vendor's
  documented response and only the description was corrected. Flag any test that awaits a handler without
  asserting on the returned value: it passes with a wrong mock in place, so a regression that re-promises
  the obsolete shape goes unnoticed.
- **Edges live testing cannot reach**: A `## Validated` table proves the happy path against one real
  account; it does not cover the paths review keeps finding. Each edge below is owed only when the
  connector has the thing it tests — read the left column first and skip the row if the answer is no. A
  connector with none of them (an MCP-only spec, or one with plain `GET` reads) owes none of these, and
  asking anyway invites an author to invent a test for behaviour the connector does not have.

  | Only if the spec has | Flag a suite with no case for |
  | --- | --- |
  | an action that proxies a call whose non-2xx answers are meaningful | that non-2xx returned as a result, with its error body |
  | a request sending a credential in a custom header | a 3xx, asserting `maxRedirects: 0` and the returned `Location` |
  | a list action following a continuation link | a multi-page response, and the page cap reporting `truncated` |
  | a list action following a continuation link | an off-origin link — absolute *and* protocol-relative (`//evil.example/items`) — asserting pagination stops with no authenticated follow-up request |
  | an input with a size or byte bound | an over-sized input rejected at the schema boundary, **including a non-ASCII case** for a byte bound |
  | a regex constraining a URL path | both the accept and the reject cases, table-driven |
  | an action polling a URL from a response (`Location`, `Azure-AsyncOperation`) | an off-origin URL with no authenticated follow-up, and a 403 raised at once rather than after the poll timeout |
  | a caller-supplied URL-shaped cursor | a same-host URL for another tenant or repository, rejected |
  | a handler replacing a nested object | its least obvious field set on the current resource, surviving an update that omits it |
  | more than one auth type | each auth-specific branch, with `authType` in `ctx.secrets` rather than `ctx.config` |
  | resource variants documented by the vendor | one fixture per variant, asserting its output and constraint |

  Do not read the first row as a reason to make every error a result. An ordinary `GET` that 404s or 500s
  is an error, and should stay one; the row applies to an action whose non-2xx answer is part of what the
  caller asked for.

### Security

- **Unbounded strings in Zod schemas**: Every `z.string()` in action input schemas should have a `.max(N)`
  constraint to prevent DoS from oversized inputs. This is flagged by CodeQL. Common limits: 2000 for
  freeform queries, 1024 for paths/URLs, 200 for IDs/names, 50 for short tokens or enum-like strings.
  Also applies to strings inside `z.array(z.string())` and `z.record(z.string(), ...)` key types.
- **Unbounded collection *sizes* in Zod schemas — a distinct bound from string length**: Bounding the
  strings inside a `z.array()`/`z.record()` is not enough; the collection itself also needs a cap on how
  many elements/entries it can hold. Flag any `z.array(...)` used as connector-execute input with no
  `.max(N)` on the array, and any `z.record(...)` with no cap on entry count (Zod has no
  built-in entry-count bound — use `.refine((obj) => Object.keys(obj).length <= N, { message: ... })`).
  This is easy to miss because the string-length bound on the *elements* looks like sufficient hardening
  at a glance, but an array of 100,000 short, individually-valid strings is still an unbounded-input DoS
  vector — especially if the array is later joined into a URL query string, since that also risks an
  oversized upstream request.
  Also flag the opposite: a cap *below* what the vendor accepts. `N` must come from the vendor's
  documented limit (an OpenAPI `maxItems`, an API reference limit, a server constant). When the vendor
  documents none, `N` must sit above any realistic valid request, with a comment saying so. A round
  number such as `.max(100)` on a list the vendor takes 250 of, or on a JSON Patch the Kubernetes API
  server accepts 10,000 operations of, rejects valid requests.
- **Unbounded free-form JSON bodies**: A field typed `z.unknown()`/`z.any()` — a request body forwarded
  verbatim to the service — has no shape to constrain but is still allocated and serialized on the Kibana
  server before being sent. Flag one with no `.refine()` bounding its serialized size. The refine should
  also reject a value that cannot be serialized at all (a cycle, a `BigInt`) rather than letting it fail
  opaquely inside the HTTP client.
- **A byte bound measured in `String.length`**: Flag `JSON.stringify(value).length <= N` (or
  `str.length <= N`) where the limit is stated in bytes. `.length` counts UTF-16 code units, so a "1 MiB"
  cap passes roughly 1 M CJK characters and sends roughly 3 MiB upstream, defeating the cap for every
  non-ASCII payload. It should be `Buffer.byteLength(serialized, 'utf8')`. Check for a non-ASCII boundary
  test too — an ASCII-only test passes either way.
- **A URL path pattern reviewed in only one direction**: A regex constraining a value interpolated into a
  URL has two jobs — accept every legitimate value and reject every escape — and can fail at both at
  once. Check both sets. A narrow allowlist like `[A-Za-z0-9._~/-]` rejects a correctly percent-encoded
  segment (`api/users/alice%40example.com`) *and* accepts `//evil.com/x`, which a client reads as a
  protocol-relative URL to another host. Expect the RFC 3986 `pchar` set minus `:`, plus `%XX` triplets,
  with a leading `//` excluded; allowing `:` lets `http://evil.com` parse as a relative path. Flag a
  pattern whose tests only assert what it accepts.
- **SSRF**: Any URL field in connector config or workflow action input (e.g. `base_url`, `endpoint`, `webhook_url`)
  must be validated. URLs should be allowlisted, restricted to HTTPS, or otherwise prevented from being user-controlled
  in a way that could trigger requests to internal/private hosts. Flag any case where a user-supplied URL flows
  directly into a network call without validation.
- **Sensitive data in logs**: Check that query parameters and user-supplied inputs are not logged. Queries come
  directly from users in chat and may contain sensitive context. Look for `logger.debug`, `console.log`, or any
  logging that captures `query`, `input`, `prompt`, or similar fields; flag these as high-risk.

### Action Outputs

- **Handles that cannot be followed up**: For every returned value an agent is expected to pass to another
  action (an operation ID, job ID, pipeline UUID), check that the output also carries every input the
  follow-up needs, especially a project, subscription, region, or workspace that overrides the connector
  default. GKE operations came back without `projectId`, so polling a cross-project operation hit the
  default project.
- **Discovery results no action accepts**: If an action lists subscriptions, projects, or workspaces,
  check that the actions operating inside one accept it as an input. AKS `listSubscriptions` returned IDs
  every other action ignored in favour of config.
- **Computed values presented as vendor data**: Flag an output field the handler derives (a product, a
  sum, an inferred status) under a name that reads as the vendor's own value. GKE's `totalNodeCount` was
  `initialNodeCount × zones`, which is wrong for autoscaled pools.

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
