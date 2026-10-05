---
name: api-docs-review
description: Review Kibana public HTTP API documentation and versioning at its source. Use when a PR adds or changes a route with access 'public', a route summary or description, options.availability (stability, since), deprecated or discontinued, oas-tag tags, meta.description or meta.availability in @kbn/config-schema, .describe() or .meta() in Zod, oasOperationObject examples or examples/*.yaml, or spec-first OpenAPI YAML (x-state, deprecated) under docs/openapi, common/api, *.schema.yaml, or oas_docs. Checks that every new or changed public endpoint and property carries correct availability and since version, plus accuracy, completeness, and Elastic API docs style; comments on the source line, never on oas_docs/output.
---

# API docs review

Review the documentation that Kibana generates into its public OpenAPI documents, at the source that produces it.

## Scope

- Only routes with `access: 'public'` and the request, query, path, and response schemas they reference. Internal routes (`access: 'internal'` or no `access`) are out of scope. If every changed route is internal and no spec-first YAML changed, stop without findings.
- Skip backport PRs: `backport` label, a version prefix in the title such as `[9.5]` or `[8.19]`, or a base branch other than `main`.
- Never suggest editing `oas_docs/output/**`. It is generated. Every finding points at the TypeScript, Zod, or spec-first YAML line that produces the text.
- Report on changed lines only. If the problem is in a line the PR did not touch, do not report it unless the PR made the route public in this diff.

## Where the documentation lives

Code-first (most plugins):

- Route: `summary`, `description`, `operationId`, `deprecated`, `discontinued` on `router.versioned.<method>({...})` or `router.<method>({...})`; `options.tags` with an `oas-tag:` entry; `options.availability: { stability, since }`.
- `@kbn/config-schema` fields: `meta: { description, availability: { stability, since }, deprecated }`.
- Zod (`@kbn/zod` / `@kbn/zod/v4`): `.describe('...')` or `.meta({ description, openapi: { availability: { stability, since } } })`.
- Examples: `options.oasOperationObject` returning an object or a path to `examples/*.yaml`.

Spec-first (Security solution, cases, osquery, some others): `summary`, `description`, `x-state`, `deprecated`, `tags`, `examples` in `*.schema.yaml`, `docs/openapi/**`, or `common/api/**`. Never edit `*.gen.ts`.

## Versioning and availability (check first)

Every added or changed public endpoint or property needs versioning metadata. Treat each of these as a P3 finding unless noted.

1. **A route added in this PR, or switched to `access: 'public'` in this PR, must have `options.availability` with both `stability` and `since`.** `stability` is `'experimental'`, `'tech_preview'`, or `'stable'`. With no `availability` block the generated operation gets no `x-state` and the docs show no lifecycle badge. With `since` but no `stability` the stateful docs show `Added in <since>` and the serverless docs show an empty badge. Do not flag pre-existing routes that lack `availability` when the PR touched them for other reasons; most of the legacy surface is unannotated.
2. **`since` must be the version this PR ships in.** Read `package.json` at the repository root with `read_file` and compare its `version`. Flag `since` greater than that version. Flag `since` lower than that version unless the PR has a backport label (`backport:*`, `v9.x.y`) targeting that lower version; when it does, `since` should equal the lowest targeted version. If you cannot see labels, report the mismatch as a question (P4), not an error.
3. **Stability changes are documentation changes.** If the PR removes an experimental or tech-preview gate, a feature flag, or a "technical preview" note from a public route, `stability` must change in the same PR. A route still behind a feature flag must not declare `'stable'`.
4. **A new property on an existing public route needs its own availability** when the route's `since` is older than the current `package.json` version: `meta: { availability: { stability, since } }` in `@kbn/config-schema`, `.meta({ openapi: { availability: { stability, since } } })` in Zod v4. Applies to request body, query, path, and response fields. A property with `availability` missing either `stability` or `since` is also a finding.
5. **Spec-first YAML carries `x-state` by hand, and it drifts.** Operation level: `x-state: Technical Preview; added in 9.6.0` (or `Experimental; ...`, `Generally available; ...`). Property level: `x-state: Added in 9.6.0` next to `description`. Flag a new operation or property with no `x-state`, with a lifecycle label but no version, or with a version but no label. Use the generator's exact strings (`Technical Preview`, `Generally available`, `Experimental`, `; added in X.Y.Z`) so spec-first and code-first render the same badge.
6. **Deprecation is explicit in both places.** Code-first: `deprecated: { documentationUrl, severity, reason }` on the route and, if a removal version is known, `discontinued: 'X.Y.Z'`; `meta: { deprecated: true }` on a field. Spec-first: `deprecated: true` plus a description that opens with `**Deprecated in X.Y.Z.** Use <replacement> instead.` A description that says "deprecated" with no flag, or a flag with no version and replacement in the description, is a finding.
7. **Version-dependent behavior goes in the description.** If the handler checks an agent, package, or API version at runtime, or behaves differently on serverless, the description must say so with the number ("agents on version 9.6.0 or later"). `since` is stripped from serverless docs, so serverless-specific constraints must be in prose. This rule is about versions the handler compares against, not about the PR itself: do not ask for "since version X" prose because an existing endpoint's behavior changed in this PR. That is what `since` and property-level availability are for.

Link one of these in the finding: `https://www.elastic.co/docs/contribute-docs/api-docs/organize-annotate#specify-api-lifecycle-status`, `https://www.elastic.co/docs/contribute-docs/api-docs/kibana-api-docs-quickstart#make-your-docs-changes`.

## Completeness

8. **Summary.** Every new public route has a `summary`: 5 to 45 characters, starts with a basic verb (Get, Create, Update, Delete), includes articles ("Delete a space"), sentence case, no trailing period.
9. **Description.** Every new public route has a `description` that adds something beyond the summary: purpose, prerequisites, constraints, how parameters interact. A description that restates the summary is a finding.
10. **Narrative doc link.** When sibling routes on the same resource end with "To learn more, refer to the [docs](...)" and the new route does not, flag it (P4; the page may not exist yet). Check siblings with `read_file` on the same file or directory, not with `search_code`.
11. **Tags.** Exactly one `oas-tag:` entry per public route, sentence case, same string as sibling routes.
12. **Path parameters** have `meta.description` (or `description` in YAML).
13. **Properties.** Every new request, query, or response property has a description. `'The name.'` on `name` is a finding.
14. **Enum values** are described when the meaning is not obvious from the name (`read`/`write`/`admin` yes; `asc`/`desc` no).
15. **Defaults.** Optional fields say what happens when omitted and name the default, either via `defaultValue` plus description or in the description alone when the default is server-side.
16. **Examples.** New public routes should reference an example via `oasOperationObject` (P4 if missing). Example files must not contain placeholder or empty values and must include a success response example.
17. **Operation ID.** Advisory only: mention a missing or non-kebab-case `operationId` in one line only if a route in the diff already sets one inconsistently. Never a finding on its own.

## Description quality

Report as P4 with a suggestion block when the fix is a single-line string replacement; preserve the existing quote style.

18. Field descriptions start with a noun phrase ("Maximum number of results..."); operation descriptions start with a verb.
19. Active voice. No semicolons, no chained parentheticals. Field names and literal values in backticks.
20. No implementation detail or internal names: executor task, registry, saved object type, `v1`, "alerting engine", internal setting names a serverless user cannot change.
21. Constraints are named: ranges, max items, allowed combinations, cross-field dependencies ("Combine with `count` using `operator`").
22. Terminology matches sibling routes in the same file or directory (read them with `read_file`). Flag the same concept named two ways ("alert" vs "alert episode", "AI index" vs "AI Index"). Consistency applies to terms and casing only, never to length: do not propose shortening a description to match a terser sibling. When the new text is more informative than its siblings, keep it.
23. Error-message strings a user will see explain how to resolve the problem, not internal state.
24. Behavior on omission is stated for every optional field ("Omit to keep the stored value").

## Evidence gate

- Before claiming something is missing, open the file at PR head with `read_file`. Absence from the diff is not absence from the file.
- Before flagging terminology or a missing doc link, read at least one sibling route in the same directory.
- Before flagging `since`, read `package.json` `version`.
- Do not report lint the OAS linters already catch on the output (missing `operationId`, summary length) unless the fix is on a changed line.

## Reporting

- One finding per problem, anchored to the changed source line. Severity per the service rubric: inaccurate or missing availability, deprecation, or description is P3; wording, style, and missing doc links are P4.
- Put the rule number in the evidence as `api-docs rule N`.
- Use a suggestion block only for a minimal single-line replacement of the description string. Otherwise describe the change in prose.
- Finish without findings when nothing in scope changed.
