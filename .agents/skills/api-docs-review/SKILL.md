---
name: api-docs-review
description: >
  Review a Kibana PR for OpenAPI Spec (OAS) and API docs compliance against the
  Elastic API docs checklist, core guidelines, and Kibana quickstart. Checks
  availability, summaries, descriptions, parameters, examples, tags, links,
  defaults, enums, deprecation, and generated YAML correctness. Use when reviewing
  a Kibana PR that touches public API routes (access 'public'), route summaries or
  descriptions, options.availability, schema meta descriptions, oasOperationObject
  examples, or OAS output files, or when asked to check OAS, availability, x-state,
  or API docs compliance on a PR.
metadata:
  source: https://github.com/elastic/elastic-docs-skills/tree/main/skills/review/docs-check-kibana-oas
  source_version: "1.0.1"
---

# Check Kibana OAS

You are reviewing a Kibana PR from `elastic/kibana` against the [Elastic API docs checklist](https://www.elastic.co/docs/contribute-docs/api-docs/checklist), [core guidelines](https://www.elastic.co/docs/contribute-docs/api-docs/guidelines), and [Kibana quickstart](https://www.elastic.co/docs/contribute-docs/api-docs/kibana-api-docs-quickstart). Every finding names the file and line to change.

## Scope

- Only routes registered with `access: 'public'` and the schemas they reference are published, so only those are in scope. Routes with `access: 'internal'` or no `access` are out of scope. If no public route or schema changed, stop without findings.
- Skip backport PRs (a base branch other than `main`, or a `[9.5]`-style title prefix); the review belongs on the original PR.

## Key principle: YAML is generated, TypeScript is the source of truth

The files under `oas_docs/output/` (`kibana.yaml`, `kibana.serverless.yaml`) are auto-generated from TypeScript route definitions. CI regenerates them on push. Use the YAML diff, when you have it, to detect problems (missing `x-state`, wrong stability label, empty values), but every finding must point at the TypeScript source that generates it. Never suggest manually editing the YAML.

## Inputs

**Automated review (Libra).** You receive the PR title, body, base branch, the changed-file list, and the review-scope diff. You do not receive labels. `oas_docs/output/**` is excluded from the diff, so work from the source files. The diff is the source of old-versus-new content; use `read_file` on changed files, and on sibling route files in the same directory, at the PR head to see the whole definition and confirm line numbers. Do not run commands, and do not use `search_code` to find conventions or examples; the sibling comparison in step 3 is done by reading named files.

**Local review.** Given a PR number or URL:

```bash
gh pr diff <PR_NUMBER> --repo elastic/kibana
gh pr view <PR_NUMBER> --repo elastic/kibana --json title,body,files,headRefName
gh pr checkout <PR_NUMBER>
```

Read source files from the checkout, not from the diff, for line numbers. If no Kibana checkout is available, ask for the path.

## Workflow

### 1. Classify the changes

From the diff, sort changed files into:

- **Route definitions**: `.ts` files under `server/routes/` registering `router.versioned.*` or `router.*` endpoints
- **Schema definitions**: `.ts` files with `schema.object` / `schema.maybe` / etc. (`@kbn/config-schema`) or `z.object` / `.describe()` / `.meta({ openapi: {...} })` (Zod) used in route validation
- **Spec-first YAML**: hand-written OpenAPI under `docs/openapi/`, `common/api/`, or `*.schema.yaml` (Security, Fleet, Endpoint). These are published as written: `x-state`, `description`, and `deprecated` are typed by hand, so the rules below apply to the YAML directly
- **Generated YAML**: `oas_docs/output/` (local review only) — scan for diagnostic signals only
- **Example files**: YAML under `routes/examples/`
- **Other**: types, tests, mocks — note but do not audit

Kibana field equivalents, so one rule reads across all three forms:

| Rule says | `@kbn/config-schema` | Zod | Spec-first YAML |
|---|---|---|---|
| route `availability` | `options.availability` | `options.availability` | `x-state` on the operation |
| property `meta.description` | `meta: { description }` | `.describe('...')` | `description:` |
| property `meta.availability` | `meta: { availability }` | `.meta({ openapi: { availability } })` | `x-state` on the property |

### 2. Audit

Apply every rule from the rules section below against the diff. If you have the generated YAML, use it as a cross-check signal: if it looks wrong (missing `x-state`, empty `x-state`, wrong label), trace it back to the TypeScript source to find the root cause.

For every finding, read the actual file at the PR head to confirm the exact line number. Point at the line where the developer needs to make the change.

Read before you assert. A diff hunk shows a window, not the file:
- Before reporting that a summary, description, `availability`, `meta`, or example is missing, read the full route or schema definition. The field may sit outside the hunk or come from a shared schema the route spreads in.
- Before flagging terminology, casing, a tag, or a missing doc link, read the sibling you are comparing against and quote it.
- Before flagging a `since` value, read `version` in the root `package.json` at the PR head.

### 3. Cross-check sibling routes

When the PR adds a new route to an existing resource, read the existing routes from the same file or directory to compare conventions. Look for patterns like narrative doc links, tag usage, or example files that siblings use but the new route does not.

In automated review, start with the rest of the changed file. If each route lives in its own file, read the directory's `index.ts` (it imports every sibling) and then one or two of the sibling files it names. Do not search for siblings.

### 4. Output

**Automated review (Libra).** Report one finding per issue, anchored to a changed line in a changed file. These findings are not style nits: every `summary`, `description`, `availability`, and `x-state` value here is published verbatim at elastic.co/docs as the API contract, so state the user-visible effect in the claim (a route with no lifecycle label, a wrong version badge, a parameter users cannot understand) and let the service rubric set severity. Name the rule in the evidence as `OAS rule N`. Include the before → after when the fix is a one-liner, as a suggestion block when it replaces a single line. Do not report pre-existing issues on lines the PR did not change. Do not print a report.

**Local review.** Print a flat action list, then a summary. Be terse. No diagnosis essays.

```
## OAS review — PR #<NUMBER>

**<PR title>**

### Actions

1. ❌ **Add `stability` to availability** — agents.ts:689
   `availability: { since: '9.5.0' }` → `availability: { stability: 'experimental', since: '9.5.0' }`

2. ❌ **Add description for `user_id` path param** — agents.ts:140
   Path parameters must have `meta: { description: '...' }`.

### Passes

- ✅ `summary` and `description` present — agents.ts:684
- ✅ Tags include `oas-tag` — agents.ts:680

### Verdict

**N actions** (X required, Y suggested)
```

- ❌ for actions the author needs to address
- ✅ for passes — list briefly, one line each
- Tag pre-existing issues as "(pre-existing)" so the PR author knows what they introduced vs. inherited
- Always include the before → after when the fix is a one-liner

---

## Rules

These rules come from the [Elastic API docs checklist](https://www.elastic.co/docs/contribute-docs/api-docs/checklist), the [core guidelines](https://www.elastic.co/docs/contribute-docs/api-docs/guidelines), the [organize and annotate guide](https://www.elastic.co/docs/contribute-docs/api-docs/organize-annotate), and the [Kibana quickstart](https://www.elastic.co/docs/contribute-docs/api-docs/kibana-api-docs-quickstart). They also incorporate conventions observed across existing Kibana routes.

### 1. Route-level availability (lifecycle status)

Every new route MUST have `availability` in its `options` block with both `stability` and `since`. This powers the version badges and tech preview labels in the published API docs.

Valid `stability` values and their rendered labels:

| Value | Rendered label | Meaning |
|---|---|---|
| `'experimental'` | Experimental | Can change or be removed in future versions |
| `'tech_preview'` | Technical preview | Pre-release, may change |
| `'stable'` | Generally available | Stable for production use. Not a default: omitting `stability` renders no lifecycle label at all |

`since` is a version string like `'9.2.0'`. It marks the version when the API first shipped. It appears in Elastic Stack docs and is omitted from serverless docs.

For a new public route, `since` is the `version` in the root `package.json` at the PR head (on `main` that is the next minor, for example `9.6.0`). A lower value is correct only if the PR carries a matching backport label (`backport:version` plus `v9.5.0`, or `backport:prev-minor`). In automated review you cannot see labels, so report the mismatch as a question that names the expected value and the backport label that would justify the lower one.

Stability tracks the gate, not the intent. A route still behind a feature flag or UI setting cannot be `'stable'`. When a PR removes the flag or gate on a public route, the same PR must move `stability` to `'stable'`; when it adds a gate, `stability` must leave `'stable'`.

Spec-first YAML carries the same information in `x-state`. Use the exact strings the generator emits so the two sources read the same in the published docs: `Technical Preview; added in 9.6.0`, `Generally available; added in 9.6.0`, or `Experimental; added in 9.6.0`. Flag a label with no version, a version with no label, or no `x-state` at all on a new operation.

Correct pattern:

```typescript
router.versioned.get({
  path: '...',
  options: {
    tags: ['...', 'oas-tag:Agent builder'],
    availability: {
      stability: 'experimental',
      since: '9.6.0',
    },
  },
})
```

What to flag:
- ❌ `availability` block missing entirely
- ❌ `stability` missing from `availability`
- ❌ `since` missing from `availability`
- ❌ `stability` has an invalid value
- ❌ `since` does not match `package.json` and no backport label explains it
- ❌ Feature flag or gate removed or added on a public route without a matching `stability` change
- ❌ Spec-first `x-state` missing, or carrying a label without a version or a version without a label

### 2. Route summary

Every new route MUST have a `summary`. Summaries appear in IDEs, search results, and documentation overviews.

Summary guidelines:
- **5–45 characters** — keep it short because space is limited in many contexts
- **Start with a verb** — "Get", "Create", "Update", "Delete"
- **Use basic verbs** — "Get" not "Retrieve", "Update" not "Modify"
- **Include articles** — "Delete a space", "Delete spaces"
- **Sentence case** — capitalize only the first word and proper nouns
- **No trailing period**

What to flag:
- ❌ `summary` missing
- ❌ Summary exceeds 45 characters
- ❌ Summary does not start with a verb
- ❌ Summary uses title case or ends with a period

### 3. Route description

Every new route MUST have a `description`. Descriptions support markdown formatting and should cover:

- **Purpose and impact**: what does this operation do and why would a user need it?
- **Prerequisites or context**: what should users know before calling this endpoint?
- **Constraints**: valid values, formats, size limits, rate limits
- **Relationships**: how parameters interact, how multiple values are handled

A good description adds detail beyond the summary. A bad description just restates it.

Good: `'Create a new conversation with an agent. The conversation persists across sessions and can be shared with other users via access control. To learn more, refer to the [agent chat documentation](https://www.elastic.co/docs/...).'`

Bad: `'Creates a conversation.'` (restates the summary, adds nothing)

Style, for route and property descriptions alike:
- Operation descriptions start with a verb (`Get`, `Create`, `Update`, `Delete`). Field descriptions start with a noun phrase (`The identifier of...`, `A list of...`), not `This field...` or `Used to...`.
- Active voice. Short sentences. No semicolons, no chained parentheticals, no stacked clauses.
- Backticks around field names, enum values, paths, and literal values the user types.
- Written for the API consumer. No internal names: executor tasks, registries, saved object types, `v1`/`v2` version labels, plugin or service names ("the alerting engine"), or settings a serverless user cannot change.
- Error messages and error-response descriptions tell the user how to resolve the problem (`Specify either agent_id or conversation_id, not both.`), not what went wrong internally (`Invalid state: both ids present.`).

What to flag:
- ❌ `description` missing
- ❌ Description is just a copy or restatement of the summary
- ❌ Description omits constraints or prerequisites that a user would need
- ❌ Description names internal components, or uses passive voice, semicolons, or chained parentheticals where a plain sentence would do

### 4. Narrative documentation link

Route descriptions should include a trailing sentence linking to the relevant narrative docs page. This is a convention observed across existing Kibana routes. It is most important when sibling routes on the same resource already include such a link.

Pattern:

```typescript
description:
  'List all conversations. To learn more, refer to the [agent chat documentation](https://www.elastic.co/docs/...).',
```

How to check: compare against sibling routes. If other routes on the same resource include a "To learn more..." or "refer to the [docs](...)" link and the new route does not, flag it.

What to flag:
- ❌ Missing narrative doc link when siblings include one (warning, not error — the link might not exist yet for a brand-new feature)

### 5. Tags

Routes MUST have at least one `oas-tag:` entry in their `tags` array. Tags group APIs by feature in the published docs.

Tag guidelines:
- Use sentence case: `'oas-tag:Agent builder'` not `'oas-tag:agent builder'`
- Use consistent tag names across related routes
- One `oas-tag` per route for clean navigation

What to flag:
- ❌ No `oas-tag:*` in the tags array
- ❌ Tag name uses inconsistent casing vs. sibling routes
- ❌ Multiple `oas-tag:` entries on a single route

### 6. Path parameter descriptions

Every path parameter MUST have `meta: { description: '...' }` in its schema definition.

Correct pattern:

```typescript
params: schema.object({
  conversation_id: schema.string({
    meta: { description: 'The unique identifier of the conversation.' },
  }),
}),
```

What to flag:
- ❌ A path parameter has no `meta` or no `description` inside `meta`

### 7. Property descriptions

Every new request body, query, or response property MUST have `meta: { description: '...' }`.

A good property description explains what the value controls, its format, and any constraints:

- ❌ `'The page size.'` — vague, no constraints, no default
- ✅ `'The maximum number of results to return. Must be between 1 and 1000. Defaults to 20.'`

Cover what the schema enforces and what the server does when the value is absent:
- Constraints that exist in the schema (`minLength`, `maxLength`, `min`, `max`, patterns, allowed values) appear in the description.
- Cross-field dependencies are stated on the field (`Required when type is webhook.`, `Ignored unless enabled is true.`).
- Optional fields say what happens when they are omitted (`If omitted, all spaces are searched.`), not just that they are optional.

Match the terminology of sibling properties and routes on the same resource. If siblings call it a "connector," do not introduce "integration." If siblings use `space ID`, do not write `space identifier`. This is about terms and casing only: never shorten a complete description to match a terser sibling, and never flag a description for being longer than its neighbors.

What to flag:
- ❌ New property has no `meta` at all
- ❌ `meta` exists but has no `description`
- ❌ Description is a single generic phrase that restates the property name (for example, `'The name.'` on a property called `name`)
- ❌ A constraint enforced by the schema, a cross-field dependency, or the omission behavior is left out
- ❌ A term or casing differs from the sibling you read (quote the sibling)

### 8. Enum value descriptions

When a property uses `schema.oneOf` or `schema.literal` to define a fixed set of values, each value should be described, either in the property description or in the individual schema options.

Skip documenting values that are self-explanatory:
- `true` / `false`, `asc` / `desc`, `enabled` / `disabled` — obvious from the name
- `read` / `write` / `admin` — not obvious; what does `admin` grant beyond `write`?
- `low` / `medium` / `high` — not obvious; what concretely changes at each level?

What to flag:
- ❌ Enum values with no descriptions when the meaning or behavioral difference is unclear from the name

### 9. Default values

Optional parameters and properties should document their defaults. In Kibana route schemas, a schema with `defaultValue` is already optional; do not wrap it in `schema.maybe()`, which replaces the inner default with `undefined` (`MaybeType` applies `.default(() => undefined)` over the wrapped schema). Either give the schema a `defaultValue` and state it in the description, or use `schema.maybe()` and document the server-side default in the description.

Correct pattern:

```typescript
page_size: schema.number({
  defaultValue: 20,
  meta: { description: 'Number of results per page. Defaults to 20.' },
}),
```

When the default is set server-side (not in the schema), document it in the description instead: `'Sort order. The server defaults to descending if not specified.'`

How to check: compare against sibling routes on the same resource. If a sibling documents its `page_size` default but the new route does not, flag it.

What to flag:
- ❌ Optional parameter with an undocumented default when the behavior changes based on the value
- ❌ `schema.maybe()` wrapping a schema that has a `defaultValue`; the documented default never applies

### 10. Property-level availability

When a new property is added to an existing route's schema, and that property ships in a later version than the route itself, the property MUST have its own `meta.availability` with `stability` and `since`.

How to detect: look for added `schema.maybe(...)` or `schema.object(...)` fields (or new Zod fields, or new properties in spec-first YAML) inside an existing route's validation block. The property's shipping version is the `version` in the root `package.json` at the PR head. If the route's `since` (or spec-first `x-state` version) is lower than that, the property needs its own availability. If the route has no `availability` at all, flag the route under rule 1 only, since there is no baseline to compare.

Correct pattern:

```typescript
new_field: schema.maybe(
  schema.string({
    meta: {
      availability: { stability: 'experimental', since: '9.6.0' },
      description: 'Description of the new field.',
    },
  })
),
```

What to flag:
- ❌ New property on an older route has no `meta.availability`
- ❌ Property has `availability` but is missing `stability` or `since`

### 11. Deprecation

Deprecated routes and properties must be marked in the form their source uses, and the description must say what to use instead.

Code-first route: `options.deprecated` is a `RouteDeprecationInfo` object, not a Boolean: `documentationUrl` (required), `severity` (`'warning'` or `'critical'`), `reason` (`{ type: 'bump', newApiVersion }`, `{ type: 'remove' }`, `{ type: 'migrate', newApiPath, newApiMethod }`, or `{ type: 'deprecate' }`), and an optional `message`. `options.discontinued` takes the release version or date when the route will be removed (`'9.0.0'`), is surfaced in the OAS, and is used alongside `deprecated`; replacement guidance goes in the description or `message`, not in `discontinued`.

Schema property (`@kbn/config-schema` `meta: { deprecated: true }`) and spec-first operation or property (`deprecated: true` in the YAML): set the marker and open the description with `**Deprecated in 9.6.0.** Use ... instead.` so the version and replacement survive into the published page.

What to flag:
- ❌ Code-first route described as deprecated but `options.deprecated` is missing, or is missing `documentationUrl` or `reason`
- ❌ `options.discontinued` holds prose instead of a version or date
- ❌ Schema property or spec-first operation or property described as deprecated but without `deprecated: true`
- ❌ Deprecated route or property has no description text naming the replacement

### 12. Response examples

New routes SHOULD have an example file referenced via `oasOperationObject`. Examples significantly improve API documentation usability.

Inline TypeScript examples (type-checked at dev time):

```typescript
.addVersion({
  version: '2023-10-31',
  options: {
    oasOperationObject: () => ({
      requestBody: {
        content: {
          'application/json': {
            examples: {
              example1: {
                summary: 'An example request',
                value: { name: 'Example' } as MyType,
              },
            },
          },
        },
      },
    }),
  },
})
```

YAML file examples:

```typescript
import path from 'node:path';
.addVersion({
  version: '2023-10-31',
  options: {
    oasOperationObject: () => path.join(__dirname, 'examples/my_route.yaml'),
  },
})
```

Example YAML structure (in `server/routes/examples/`):

```yaml
requestBody:
  content:
    application/json:
      examples:
        example1:
          summary: Example request
          description: An example of creating a resource
          value:
            name: 'Example'
responses:
  200:
    content:
      application/json:
        examples:
          success:
            summary: Successful response
            value:
              id: '12345'
              name: 'Example'
```

Example guidelines:
- Use realistic data, not placeholders
- Write clear summaries (under 45 characters) for each example
- Include at least one success response example (HTTP 200)
- Consider adding `x-codeSamples` for cURL and Console examples

What to flag:
- ❌ No `oasOperationObject` reference (warning — strongly recommended)
- ❌ Example file contains placeholder or empty values
- ❌ No response example for the success case

### 13. Operation ID (advisory only — do not include in the Actions list)

Public routes can optionally set an explicit `operationId`. SDK and CLI generators use this ID as the method/command name; if omitted, the generator derives one from the method and path (for example, `post-foo`), which is often unclear.

Correct pattern:

```typescript
router.versioned.post({
  path: '/api/foo',
  access: 'public',
  summary: 'Create a foo resource',
  operationId: 'create-foo',
  options: { ... },
});
```

Guidelines:
- Use kebab-case `verb-resource` names, for example `create-foo`, `get-foo`, `delete-foo`.
- Keep operation IDs stable across versions of the same route — don't rename gratuitously.

This is a suggestion, not a compliance rule — do not add it to the ❌ Actions list or count it against the verdict. Only raise it as a one-line side note ("Consider adding an explicit `operationId`") when the user specifically asks about SDK/CLI generation, operation IDs, or when a route in the diff already sets one inconsistently with the kebab-case `verb-resource` convention.

### 14. Cross-check: generated YAML as a diagnostic signal

The YAML files under `oas_docs/output/` are auto-generated. Never suggest editing the YAML directly. Every fix goes in the TypeScript source.

Use the YAML `x-state` values to detect problems:

| YAML `x-state` | TypeScript meaning |
|---|---|
| `Experimental; added in 9.6.0` | `availability: { stability: 'experimental', since: '9.6.0' }` |
| `Technical Preview; added in 9.2.0` | `availability: { stability: 'tech_preview', since: '9.2.0' }` |
| `Generally available; added in 9.0.0` | `availability: { stability: 'stable', since: '9.0.0' }` |
| `Added in 9.0.0` (no label) | `availability: { since: '9.0.0' }` — `stability` missing |
| `Experimental` (no version) | Normal for `kibana.serverless.yaml` — serverless omits `added in` |
| `''` (empty string, serverless only) | `availability: { since }` with no `stability`; serverless drops `since` and nothing is left |
| Missing entirely | Missing `availability` block in the TypeScript |

What to flag (always pointing at the TypeScript file):
- ❌ Empty or missing `x-state` → trace to the TS route and flag missing `availability` or `stability`
- ❌ YAML label does not match TS stability → flag the TS mismatch
- The serverless YAML omitting `added in` is expected, not a finding
