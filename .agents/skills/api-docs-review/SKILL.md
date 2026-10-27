---
name: api-docs-review
description: "Use when drafting or reviewing public Kibana HTTP API docs for `access: 'public'` routes."
---

# Review Kibana API docs

Summaries, descriptions, availability, and `x-state` appear verbatim in API docs. Say what users will see in each finding (no lifecycle badge, wrong version, unclear parameter) and give a one-line fix when possible.

## Scope

- Review routes with `access: 'public'`, the schemas and examples they reference, and hand-written OpenAPI under `docs/openapi/`, `common/api/`, and `*.schema.yaml`. Skip internal routes. If a change makes an existing schema public, review it and anchor the finding to the changed reference.
- `oas_docs/output/**` is generated and excluded from Libra's diff. Use it only to diagnose. Anchor findings to the route, schema, or source YAML that produces it, and never suggest editing it. Do not report findings when a PR only regenerates these files.
- Do not report API docs findings on backport PRs (`[x.y]` title prefix or `backport` label). The metadata was reviewed on `main`, and `since` legitimately differs on a backport.

## Evidence gate

1. Before reporting a missing field, read the whole route or schema at the PR head. Shared or spread schemas can define metadata outside the hunk. On versioned routes, `summary`, `description`, and `options` sit on the root config, not in `.addVersion`.
2. For a new route on an existing resource, compare one or two siblings (in the same file, or imported by the directory's `index.ts`). Use them to check terminology, tags, and narrative doc links, and quote the sibling in evidence. Do not copy an incomplete description or shorten a complete one to match it.
3. Read `version` in the root `package.json` at the PR head before judging `since`.

| Rule | `@kbn/config-schema` | Zod | Spec-first YAML |
|---|---|---|---|
| Route availability | `options.availability` | `options.availability` | operation `x-state` |
| Description | `meta.description` | `.describe()` | `description` |
| Property availability | `meta.availability` | `.meta({ openapi: { availability } })` | property `x-state` |

## Checks

### Lifecycle

- **`since`.** Every new public route needs `options.availability.since`. On `main`, it matches the root `package.json` version. A lower value is correct only with `backport:version` plus the matching `vX.Y.Z` label, or `backport:all-open`. If labels are not visible, ask whether the lower version is intentional and name the expected value. Adding a version to an existing route does not change `since`.
- **`stability`.** Every new public route needs an explicit value. Use `stable` only for APIs ready for production; use `experimental` or `tech_preview` for gated APIs. Omitting it does not default the generated OAS: Stack shows only `Added in <v>`, while serverless gets an empty `x-state`. Flag a gate added or removed without a matching `stability` change. Stability follows the current gate, not future intent.
- **Property availability.** A property added after its route shipped needs its own `since` and explicit `stability`. If the route has no availability at all, report the route-level omission instead.
- **Spec-first `x-state`.** Exact Stack forms: `Experimental; added in 9.6.0`, `Technical Preview; added in 9.6.0`, or `Generally available; added in 9.6.0`. Flag a new operation with no `x-state`, no version, or no lifecycle label (`Added in 9.6.0` alone), and flag casing drift (`Technical preview`, `; Added in`, bare `added in`). Serverless specs omit `added in` but still need the lifecycle label; an empty `x-state` means `stability` is missing.

### Operation

- **Summary.** Every new route needs one. Keep it to 5–45 characters (Redocly warns outside this), use sentence case, omit the trailing period, and open with a plain verb (`Get`, not `Retrieve`).
- **Description.** It must add purpose, prerequisites, constraints, or parameter interactions instead of restating the summary. Flag internals a consumer cannot act on (saved object types, plugins, registries, `v1`/`v2` labels, server settings) and error text that says what broke but not how to fix it. Do not repeat route privileges; the generator appends them from `security`. When sibling descriptions end with a narrative doc link, suggest one for the new route. Do not flag prose style beyond these rules.
- **Tag.** Every route needs an `oas-tag:*`; without one, it lands in the OAS with `tags: []`. The convention is one sentence-case tag matching its siblings.
- **`operationId`.** Without one, Kibana derives an ID such as `get-foo-id`, which SDK and CLI generators turn into method names. Suggest a kebab-case `verb-resource` ID for new public routes. Flag a set value that breaks that form. Duplicates fail generation.

### Schema

- **Property descriptions.** Every changed request body, query, path, or response property needs a description that says more than its name. Bad: `'The space ID.'` Better: `'Identifier of the space to query. Defaults to the current space when omitted.'` Include relevant limits, formats, patterns, cross-field requirements, behavior when omitted, defaults, and non-obvious enum differences (`read`/`write`/`admin`, not `asc`/`desc`).
- **`required` vs default.** In spec-first YAML, flag `required` that disagrees with runtime validation; a field with a default is not required.
- **`schema.maybe()` around `defaultValue`.** Do not combine them. `MaybeType` applies `.default(() => undefined)` over the inner schema, so the default never applies and the OAS loses `default`. Use the defaulted schema directly, or `schema.maybe()` with a documented server-side default.
- **Shared schema IDs.** When a change reuses a schema across routes, versions, or response codes, flag a missing `meta.id` (Zod `.meta({ id })`); the generator needs it for a named component. `meta.id` only creates a component on `schema.object`, `arrayOf`, and `oneOf`, and two different schemas sharing an id fail generation. Do not flag existing inlining that the PR leaves untouched.
- **Response schema.** If a public success response returns a body, it needs a response schema. Otherwise, the OAS shows a `200` with only a description.

### Deprecation

- **Route.** Code-first routes use an `options.deprecated` `RouteDeprecationInfo` with `documentationUrl`, `severity` (`'warning'` or `'critical'`), `reason` (`{ type: 'bump', newApiVersion }`, `{ type: 'remove' }`, `{ type: 'migrate', newApiPath, newApiMethod }`, or `{ type: 'deprecate' }`), and optional `message`. Do not set `deprecated: true` on a route; flag deprecation prose without this object. `options.discontinued` holds the removal version or date (`'9.0.0'`), not prose. Keep the text consistent with the reason: `bump` and `migrate` name the replacement, `remove` has none, and `deprecate` may not have one yet. The generated OAS still shows `deprecated: true`; that is expected.
- **Property or spec-first operation.** `@kbn/config-schema` `meta.deprecated: true` and spec-first `deprecated: true` are the markers. Flag text that says deprecated without the marker, and deprecation text with no version or replacement (`**Deprecated in 9.6.0.** Use ... instead.`).

### Examples

- Code-first routes provide request and success-response examples through `oasOperationObject` (an inline object or `path.join(__dirname, 'examples/*.yaml')`); spec-first YAML includes them directly. CI treats missing examples as an `@kbn/validate-oas` error, so report them. Also flag placeholder or empty values, summaries over 45 characters, and examples that contradict the schema.

## Reporting

- Use P2 when `schema.maybe()` swallows a default, P3 for missing or wrong lifecycle data, missing descriptions, or missing or schema-contradicting examples, and P4 for casing and wording. Do not inflate severity.
- Add a suggestion block only when applying it would fix the finding completely.
- For local reviews, list required actions first, then passes, and mark pre-existing defects. Do not post to GitHub unless asked.

Maintainers: rules derive from the [API docs checklist](https://www.elastic.co/docs/contribute-docs/api-docs/checklist), [guidelines](https://www.elastic.co/docs/contribute-docs/api-docs/guidelines), and [Kibana quickstart](https://www.elastic.co/docs/contribute-docs/api-docs/kibana-api-docs-quickstart).
