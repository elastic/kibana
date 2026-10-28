---
name: api-docs-review
description: "Use when drafting or reviewing public Kibana HTTP API docs for `access: 'public'` routes."
---

# Review Kibana API docs

Summaries, descriptions, availability, and `x-state` appear verbatim in API docs. Say what users will see in each finding (no lifecycle badge, wrong version, unclear parameter) and give a one-line fix when possible.

## Scope

- Review routes with `access: 'public'`, the schemas and examples they reference, hand-written OpenAPI under `docs/openapi/`, `common/api/`, and `*.schema.yaml`, and tag text in `oas_docs/overlays/`. Skip internal routes. Code-first checks apply only to paths listed in `.buildkite/scripts/steps/checks/capture_oas_snapshot.sh`; other public APIs, such as Cases, publish hand-written YAML, so review that instead. If a route or reference change makes an existing schema public, review it and anchor the finding to the changed reference. Publishing workflow and bundle changes do not.
- `oas_docs/output/**` is generated and excluded from Libra's diff; `*.gen.ts` and bundled files (`bundled*`, `*.bundled.schema.yaml`) are generated too. Use them only to diagnose. Anchor findings to the route, schema, or source YAML that produces it, and never suggest editing it. Do not report findings when a PR only regenerates these files.
- Do not report API docs findings on backport PRs (`[x.y]` title prefix or the `backport` label, not `backport:*`). The metadata was reviewed on `main`, and `since` legitimately differs on a backport.

## Evidence gate

1. Before reporting a missing field, read the whole route or schema at the PR head. Shared or spread schemas can define metadata outside the hunk. On versioned routes, `summary`, `description`, `security`, `discontinued`, and `options.availability` sit on the root config; `options.deprecated` and `options.oasOperationObject` sit in each `.addVersion()`.
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
- **`stability`.** Every new public route needs an explicit value. Use `stable` only for APIs ready for production; use `experimental` or `tech_preview` for gated APIs. Omitting it does not default the OAS to `stable`: Stack gets `Added in <v>`, which docs-builder renders as generally available, and serverless gets an empty `x-state`. Flag a gate added or removed without a matching `stability` change. Stability follows the current gate, not future intent.
- **Property availability.** A property added after its route shipped needs its own `since` and explicit `stability`. Skip this when the route has no availability.
- **Spec-first `x-state`.** Stack forms: `Experimental; added in 9.6.0`, `Technical Preview; added in 9.6.0`, or `Generally available; added in 9.6.0`. Flag a new operation with no `x-state`, no version, or no lifecycle label (`Added in 9.6.0` alone, which renders as GA). Do not flag casing; docs-builder matches labels case-insensitively. Spec-first YAML usually feeds both bundles, so serverless keeping `added in` is expected.

### Contract alignment

- **Runtime behavior.** When a new or changed description states behavior, a limit, a default, or a response status, read the validator or handler that implements it. Flag contradictions ("case-insensitive" over an exact match, a `404` the handler cannot return), not omissions. Sibling docs are precedent, not proof of runtime behavior.

### Operation

- **Summary.** Every new route needs one. Keep it to 5–45 characters, use sentence case, omit the trailing period, and open with a plain verb (`Get`, not `Retrieve`). `Bulk <verb>` is fine when siblings use it.
- **Description.** A new or changed description must add purpose, prerequisites, constraints, or parameter interactions instead of restating the summary. Flag internals a consumer cannot act on (saved object types, plugins, registries, `v1`/`v2` labels, server settings, UI-only terms) and error text that says what broke but not how to fix it. On code-first routes, do not repeat privileges; the generator appends them from `security`. Spec-first YAML must state them. When sibling descriptions end with a narrative doc link, suggest one for the new route.
- **Wording.** In any summary or description the PR adds or changes, including property descriptions, flag `id` for `ID`, Latin abbreviations (`e.g.`, `i.e.`), time-relative words (`currently`, `yet`, `now`), and sentences chained with semicolons or stacked parentheses. Also flag field names, values, and HTTP methods not in code format, slashes used for "or", and terms that differ from sibling descriptions. Do not flag other prose style.
- **Tag.** Every route needs an `oas-tag:*`; without one, it lands in the OAS with `tags: []`. The convention is one sentence-case tag matching its siblings. A new tag needs a description and `x-displayName`, usually in `oas_docs/overlays/`.
- **`operationId`.** Without one, Kibana derives an ID such as `get-foo-id`, which SDK and CLI generators turn into method names. For new code-first routes, suggest a kebab-case `verb-resource` ID when siblings set one or no siblings exist. Do not ask to change existing IDs, including camelCase IDs in spec-first YAML.

### Schema

- **Property descriptions.** Every property the PR adds, gives new meaning, or newly exposes, and every description it rewrites, needs a description that says more than its name. Bad: `'The space ID.'` Better: `'Identifier of the space to query. Defaults to the current space when omitted.'` Include formats, patterns, cross-field requirements, behavior when omitted, limits and defaults the schema cannot express, and non-obvious enum differences (`read`/`write`/`admin`, not `asc`/`desc`). Skip renamed properties, single-value discriminators, and standard error fields (`statusCode`, `error`, `message`).
- **Spec-first contract.** In spec-first YAML, flag parameter names, `required`, and limits that disagree with the route validator or the validation the handler runs. A field with a default is not required.
- **`schema.maybe()` around `defaultValue`.** Do not combine them. `MaybeType` applies `.default(() => undefined)` over the inner schema, so the default never applies and the OAS loses `default`. Use the defaulted schema directly, or `schema.maybe()` with a documented server-side default.
- **Shared schema IDs.** When a change reuses a request or response body schema across routes, versions, or response codes, flag a missing `meta.id` (Zod `.meta({ id })`); the generator needs it for a named component. Never suggest it on `params` or `query` schemas; config-schema throws there and Zod ignores it. `meta.id` only creates a component on `schema.object`, `arrayOf`, and `oneOf`, and two different schemas sharing an id fail generation. Do not flag existing inlining that the PR leaves untouched.
- **Response schema.** If a public success response returns a body, it needs a response schema. Otherwise, the OAS shows a `200` with only a description.

### Deprecation

- **Route.** Code-first routes use an `options.deprecated` `RouteDeprecationInfo` with `documentationUrl`, `severity` (`'warning'` or `'critical'`), `reason` (`{ type: 'bump', newApiVersion }`, `{ type: 'remove' }`, `{ type: 'migrate', newApiPath, newApiMethod }`, or `{ type: 'deprecate' }`), and optional `message`. Do not set `deprecated: true` on a route; flag deprecation prose without this object. `options.discontinued` holds the removal version or date (`'9.0.0'`), not prose. Keep the text consistent with the reason: `bump` and `migrate` name the replacement, `remove` has none, and `deprecate` may not have one yet. The generated OAS still shows `deprecated: true`; that is expected.
- **Property or spec-first operation.** `@kbn/config-schema` `meta.deprecated: true` and spec-first `deprecated: true` are the markers. Flag text that says deprecated without the marker, and deprecation text with no version or replacement (`**Deprecated in 9.6.0.** Use ... instead.`).

### Examples

- Code-first routes provide request and success-response examples through `oasOperationObject` (an inline object or `path.join(__dirname, 'examples/*.yaml')`); spec-first YAML includes them directly. `@kbn/validate-oas` requires `examples` on every request and response media type, and CI fails when the error count rises above the baseline, so report them. Also flag meaningless placeholders (`string`, `foo`) or empty values, and examples that contradict the schema or the handler.

## Reporting

- Use P2 when `schema.maybe()` drops a default the handler relies on, P3 for missing or wrong lifecycle data, descriptions that contradict the code, missing descriptions, or missing or schema-contradicting examples, and P4 for wording. Do not inflate severity.
- Add a suggestion block only when applying it would fix the finding completely.
