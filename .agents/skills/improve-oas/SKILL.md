---
name: improve-oas
description: Add or improve OpenAPI descriptions, examples, and code samples for a Kibana API area. Use when a plugin or package needs better OAS documentation — missing descriptions on schema fields, missing route summaries, missing examples, or missing code samples.
user-invocable: true
disable-model-invocation: true
---

# Improve OAS

Add descriptions, examples, and code samples to a Kibana API area so that the generated OpenAPI specification is complete and useful for humans and AI agents.

This skill operates on any package or plugin in the Kibana repo. It detects how the plugin generates its OAS contribution and adapts accordingly. For issue categorization, use `debug-oas`.

## Required interaction flow

1. Ask which API area the developer wants to improve (e.g. "fleet", "alerting", "streams").
2. Ask for the plugin or package directory path if not obvious from the API area.
3. Run discovery to detect the plugin's OAS approach.
4. Run `debug-oas` to get the current issue list and baseline count.
5. Present a summary of what needs to be done: how many routes, which categories of work (descriptions, examples, code samples, deprecation markers).
6. Implement changes route-by-route, bundling all improvements for one endpoint together.
7. After completing all routes, run validation to confirm the issue count dropped to zero (or to the expected residual).

Do not skip steps 1-2 unless the developer already provided the API area and path.

## Phase 1: Discovery

Determine whether the plugin uses **code-first** or **spec-first** OAS, and which schema library it uses. These two axes drive every other decision.

### Code-first vs spec-first

| Approach | How to detect | Source of truth |
|----------|--------------|-----------------|
| **Code-first** | No `*.gen.ts` files; schemas defined in TypeScript | Route code and TypeScript schemas |
| **Spec-first** | `*.gen.ts` files present; `@kbn/openapi-generator` in `package.json` or build scripts | YAML specs (usually under `docs/openapi/` or `common/api/`) |

Most Kibana plugins are code-first. Spec-first is used primarily by Security solution plugins/packages (security_solution, entity_store, cases, osquery, elastic-assistant, and others). When in doubt, check for `*.gen.ts` files — their presence is definitive.

**Code-first rules:**
- Edit TypeScript route files and schema files directly.
- Add examples and code samples via `oasOperationObject` (see Examples section below).
- Some code-first plugins also have hand-authored YAML in `docs/openapi/` that is merged into the final published spec. If present, check whether the plugin puts its OAS prose in route code, in the YAML, or both, and update accordingly.

**Spec-first rules:**
- Edit the YAML spec files only. Never hand-edit `*.gen.ts` files — they are overwritten on regeneration.
- Descriptions in YAML `description` fields flow through to generated TypeScript via JSDoc.
- Examples in YAML `example`/`examples` fields do **not** flow to generated code — they are documentation-only artifacts in the YAML and bundled output.
- After editing YAML, run the plugin's generation script (e.g. `yarn openapi` in the plugin directory) to regenerate.

### Schema library (code-first only)

For code-first plugins, the schema library determines how to add field descriptions:

| Library | How to detect | Field descriptions |
|---------|--------------|-------------------|
| `@kbn/config-schema` | Imports from `'@kbn/config-schema'` | `meta: { description: '...' }` on schema calls |
| Zod | Imports from `'@kbn/zod'` or `'@kbn/zod/v4'` | `.meta({ description: '...' })` on schema calls |

For spec-first plugins, this doesn't apply — field descriptions go in the YAML specs regardless of what the generated code uses.

### Style matching

Beyond the two axes above, plugins vary in how they organize code: schemas in one large file vs inline per route, descriptions in constants files vs inline strings, versioned vs non-versioned router, `createServerRoute()` vs direct router calls, etc.

**Always match the existing style of the plugin you are working in.** Read a few existing routes and schema files to understand the local conventions before making changes. If descriptions are centralized in constants, add to the constants. If schemas are inline, keep them inline. Do not impose a different organizational pattern.

### `docs/openapi/` detection

Check whether the plugin has a `docs/openapi/` directory. If it does, list all path YAML files and example YAML files — these are part of the published spec and must be updated alongside route code (see the `docs/openapi/` section under Phase 3).

## Phase 2: Analysis

Run `debug-oas` for the API area to get the current issue list. Record the baseline issue count.

Then, for each public route in the plugin:

1. **Read the route registration** to see what `summary`, `description`, and schema metadata already exist.
2. **Read the handler function** to understand what each parameter does and how the response is shaped.
3. **Check for existing examples** in `docs/openapi/`, `oasOperationObject` references, or inline.
4. **Categorize missing items**: field descriptions, route summary, route description, examples, code samples, deprecation markers.

## Phase 3: Implementation

Work route-by-route. For each route, bundle all improvements together: schema field descriptions, route summary/description, examples, and code samples. This keeps changes reviewable and focused.

### Writing descriptions — quality rules

These rules apply regardless of the plugin's OAS approach.

**Verify against implementation.** Read the handler function and trace how each parameter is used before writing a description. Never infer behavior from parameter names alone. Do not expose implementation details in the description — see target audience rules below.

**Flag unused parameters.** If a parameter is accepted in the schema but never referenced in the handler body, flag it to the developer rather than documenting nonexistent behavior.

**Summary format:** 5-45 characters, start with a verb, sentence case, no trailing period, include articles. Match the operation verb — for example, "Get a data view" on a GET and "Delete a data view" on a DELETE. Path parameters shared across methods must have context-appropriate descriptions too.

**Description format:** Explain what the operation does and why a user would call it. Document constraints and side effects visible to the API caller, and relationships to other API operations. Use markdown links for references to external docs. End descriptions with a newline character in YAML.

**Target audience.** The reader is an API consumer — a developer integrating with Kibana from the outside, or an AI agent calling the API. They do not have access to Kibana source code and do not know internal implementation details. Descriptions should answer "what does this do for me?" not "how is this implemented?"

- Do NOT mention: internal class/function names, saved-object implementation details, internal privilege names, or Kibana-internal concepts that aren't visible through the API surface.
- DO mention: what the endpoint does in product terms, what inputs are required vs optional, what the response contains, behavioral constraints the caller should know (rate limits, side effects, ordering dependencies), and links to relevant Elastic docs.
- Descriptions should read naturally as standalone documentation — as if they appeared on a docs page with no surrounding code.

### `@kbn/config-schema` field descriptions

Add `meta: { description }` to every `schema.*()` call that represents an API-visible field:

```typescript
// Before
name: schema.string({ maxLength: 1000 }),

// After
name: schema.string({
  maxLength: 1000,
  meta: { description: 'A display name for the data view.' },
}),
```

For fields with no existing options object:

```typescript
// Before
override: schema.maybe(schema.boolean()),

// After
override: schema.maybe(
  schema.boolean({
    meta: {
      description:
        'Override an existing data view if a data view with the provided identifier already exists.',
    },
  })
),
```

When `schema.maybe()` wraps another schema call, place `meta` on the inner call, not on `schema.maybe()` itself.

When a field is used in both request and response schemas, write a single description that works for both contexts. If the meaning differs by context, use separate schema definitions.

### Schema IDs for shared schemas

If the same schema appears in multiple routes, versions, or status codes, give it an ID via `meta.id`. This lets the OAS generator emit a `$ref` to `#/components/schemas/<id>` instead of inlining the full schema every time.

With `@kbn/config-schema`:

```typescript
export const addressSchema = schema.object(
  { street: schema.string(), city: schema.string() },
  { meta: { id: 'Address', description: 'Mailing address for a foo resource.' } }
);
```

With Zod:

```typescript
export const addressSchema = z
  .object({ street: z.string(), city: z.string() })
  .meta({ id: 'Address', description: 'Mailing address for a foo resource.' });
```

If an API uses tagged unions, prefer `schema.discriminatedUnion('type', [...])` or `z.discriminatedUnion('type', [...])` over a plain union. With Zod, when each variant has its own `.meta({ id })`, the OAS generator produces a discriminator mapping automatically.

### Zod field descriptions

For plugins using Zod schemas, use `.meta({ description })`:

```typescript
// Before
name: z.string(),

// After
name: z.string().meta({ description: 'A display name for the stream.' }),
```

**Important:** `.meta()` is immutable — it returns a new schema. Always attach `.meta()` at definition time. Calling it later does not update the schema that your route already references.

### Route-level summary and description

Every route needs a `summary` and `description`. Read existing routes in the plugin to see if and where these are already set. If some routes already have them, follow that pattern. If none do, add them directly to the route config — on the top-level config for versioned routes, or in the `options` object for non-versioned routes and `createServerRoute`.

If the plugin centralizes descriptions in a constants file (e.g. `*_DESCRIPTION` exports), add or update entries there rather than inlining.

### Response schemas

For OAS to include response body documentation, the route must define `validate.response` with a schema and description for each status code. If a route is missing response validation, the generated OAS will have no response schema — add one.

Always define response schemas as factory functions so the schema object is not allocated in production — response validation is only used at dev time for OAS generation:

```typescript
// Correct: schema is only instantiated when called
const myResponseSchema = () => schema.object({ id: schema.string(), name: schema.string() });

// Wrong: schema is eagerly allocated at module load
const myResponseSchema = schema.object({ id: schema.string(), name: schema.string() });
```

Use these standard response descriptions for consistency across plugins:

| Status | Description |
|--------|-------------|
| 200 | Indicates a successful call. |
| 400 | Bad request. |
| 401 | Authorization information is missing or invalid. |
| 403 | Insufficient privileges. |
| 404 | Object is not found. |

### Examples and code samples (code-first)

Code-first plugins provide examples via `oasOperationObject` — a lazy function on the route options that returns either an inline object or a path to a YAML file. The result is deep-merged into the auto-generated OAS operation. Check existing routes in the plugin to see which style is already in use.

Prefer inline TypeScript objects for new examples — they are type-checked at dev time. Use YAML files only when the plugin already uses them or the examples are large. If adding YAML files, place them in an `examples/` directory alongside the route files and name them `{noun}_{verb}.yaml` (e.g. `agents_create.yaml`).

A typical `oasOperationObject` includes request/response examples and code samples. Use `examples` (plural map with named keys), not `example` (singular):

```yaml
requestBody:
  content:
    application/json:
      examples:
        createExample:
          summary: Create a weekly maintenance window
          value:
            title: "Weekly patching window"
            schedule:
              custom:
                starts_at: "2025-03-12T02:00:00.000Z"
                duration: "1h"
responses:
  200:
    content:
      application/json:
        examples:
          createResponseExample:
            summary: A created maintenance window
            value:
              id: "a1245-678-abc"
              title: "Weekly patching window"
x-codeSamples:
  - lang: curl
    source: |
      curl \
        -X POST "${KIBANA_URL}/api/maintenance_window" \
        -H "Authorization: ApiKey ${API_KEY}" \
        -H "kbn-xsrf: true" \
        -H "Content-Type: application/json" \
        -d '{"title":"Weekly patching window"}'
  - lang: Console
    source: |
      POST kbn://api/maintenance_window
      {"title":"Weekly patching window"}
```

**Example quality rules:**
- Include error response examples (400, 404, etc.) alongside the 200, matching the status codes the route actually returns.
- Response examples must include server-generated fields (id, timestamps, computed values). Show nullable fields as `null`, not omitted.
- Use realistic fake data, not placeholders like `"string"` or `0`. Prefer middle-range values for numeric fields.
- When an endpoint accepts meaningfully different payloads, add multiple named examples under `examples:`.

**Code sample conventions:**
- Always include both `curl` and `Console` samples.
- Generate `curl` from Console syntax using `@elastic/request-converter` rather than hand-writing. Apply fixups: replace `$ELASTICSEARCH_URL` with `${KIBANA_URL}`, replace `$ELASTIC_API_KEY` with `${API_KEY}`, and add `-H "kbn-xsrf: true"` for mutating methods (POST, PUT, DELETE).
- Use `x-codeSamples` (camelCase) for new code sample keys, unless the plugin already uses `x-code-samples` (hyphenated) — in that case, match the existing key name.

### `docs/openapi/` path and example files

If the plugin has `docs/openapi/` path YAML files, you MUST update them. These files are merged into the published API spec and are the primary place where `x-codeSamples`, `description`, and `examples` appear for consumers. Skipping them means the published docs will be incomplete.

For each path YAML file: ensure `summary` and `description` match the route-level constants, and add `x-codeSamples` with both curl and Console samples. For each example YAML file: ensure a `description` field is present.

If `x-codeSamples` cannot be added via `oasOperationObject` due to typing limitations, add them to the YAML path files instead. Do not skip code samples.

After modifying YAML files, regenerate bundled output:

```bash
cd <plugin_path>/docs/openapi && npx @redocly/cli bundle 2>/dev/null
```

### Deprecated routes

For deprecated routes, set `deprecated: true` on the route config and prefix the description with a deprecation notice. Use one of these forms:

- `Deprecated in <version>. Use <replacement endpoint> instead.` — for routes with a direct replacement.
- `Deprecated in <version>.` — when no replacement exists.
- For legacy route mirrors (e.g. `/api/index_patterns` mirroring `/api/data_views`), use the primary route's description prefixed with the deprecation notice.

### Completeness check

Before moving to verification, confirm every item below is complete. Do not proceed with partial coverage — but also do not fabricate descriptions to check boxes. If a field or route's behavior is unclear after reading the handler, flag it to the developer rather than guessing.

- Every public route has a `summary` and `description` set.
- Every schema field visible in the API has a `meta: { description }` (or `.describe()` for Zod).
- Every `docs/openapi/` path YAML file has `description` and `x-codeSamples` for each operation.
- Every `docs/openapi/` example YAML file has a `description` field.
- Every deprecated or legacy route has deprecation metadata.
- Bundled output (`bundled.yaml`, `bundled.json`) has been regenerated if any YAML was modified.

## Phase 4: Work organization

- If the plugin has shared schema files, add field descriptions to shared schemas before per-route schemas to avoid duplication.
- One commit per route or logical group of routes (e.g. all CRUD operations for a single resource). Each commit should be independently reviewable.

## Phase 5: Verification

1. Run the `validate-oas` skill for the API area to confirm the issue count dropped. It handles environment refresh and scoped validation.
2. If the plugin has `docs/openapi/` with bundled files, regenerate bundled output.
3. Use `debug-oas` if any issues remain to understand what is left.
4. Check for regressions: the total issue count for the API area should not increase.

## Common pitfalls

- **`schema.maybe()` placement**: Place `meta: { description }` on the inner schema call, not on the `schema.maybe()` wrapper.
- **Shared schema fields**: When a shared schema field (like a path parameter) is used by multiple routes with different HTTP methods, write a single description that works for all contexts, or use per-route schema definitions if the semantics differ.
- **Custom route wrappers**: Some plugins use custom wrappers around the core router (e.g. `createCasesRoute`). The underlying config shape is the same — look at what the wrapper passes through.
- **`operationId` typos**: Fix these opportunistically when spotted in YAML path files. Search the codebase for references to the old `operationId` before renaming — generated clients derive method names from it, and the workflows/connector pipeline maintains an explicit allowlist of operation IDs.
- **Missing schema IDs**: If you see the same schema inlined repeatedly in the generated OAS, add `meta.id` (or `.meta({ id })` for Zod) to the shared schema definition so the generator emits a `$ref` instead.
- **Zod `.meta()` immutability**: `.meta()` returns a new schema. If you call `.meta()` after the schema is already referenced by a route, the route keeps the old schema without your metadata. Always attach `.meta()` at definition time.
- **OAS-incompatible schema types**: Some `@kbn/config-schema` types (`schema.byteSize()`, `schema.duration()`, `schema.any()`, `schema.conditional()`, etc.) produce poor or lossy OAS. See `dev_docs/tutorials/generating_oas_for_http_apis.mdx` for the full compatibility table and preferred alternatives.
- **Availability metadata**: Routes and fields can declare `availability: { since, stability }` to generate `x-state` annotations in the OAS. If a route is missing this metadata, flag it to the developer — the values require knowledge of release history.
- **Trailing periods on summaries**: Summaries must not end with a period. Some existing routes (e.g. maintenance_window) violate this — do not copy that style.
