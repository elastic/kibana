---
name: fix-package-docs
description: Fix API documentation issues in a Kibana plugin or package. Use when asked to fix, improve, or add JSDoc/API documentation for a Kibana plugin or package, or when check_package_docs validation fails.
disable-model-invocation: true
---

# Fix Package Docs

Systematically find and fix all actionable API documentation issues in a Kibana plugin or package using `check_package_docs`.

## Non-negotiable conventions

- **Only add JSDoc to exported public API** — skip internal helpers that happen to be exported.
- **Never change runtime behavior** — documentation edits only (no logic, type, or signature changes).
- **Use `/** ... */` style** (not `//`). Single-line `/** Description. */` for simple items; multi-line for complex ones.
- **Descriptions are sentences**: start with a capital letter, end with a period.
- **`@param name - Description.`** (hyphen separator, not colon). Match every parameter in the signature.
- **Destructured object parameters**: document nested properties with dot-notation tags (e.g., `@param options.foo - Description.`). The tooling supports arbitrary nesting (e.g., `@param fns.fn1.foo.param`). Each level must have its own `@param` tag.
- **`@returns` for non-void functions**: always present; omit only for `void`/`Promise<void>`.
- **Use `{@link OtherType}`** for cross-references to other Kibana types.
- **`missingExports`** items need human judgment to decide whether to export — skip them and note in PR.

## Workflow

### 1. Resolve the target

Given a plugin ID (e.g., `dashboard`), manifest ID (e.g., `@kbn/dashboard-plugin`), or file path:

- Plugin ID → use `--plugin <id>`
- Manifest ID / package name → use `--package <id>`
- File path → find its package first (look for nearest `kibana.jsonc`)

To confirm: search for the `plugin.id` in `kibana.jsonc` files if unsure.

```bash
grep -r '"id": "dashboard"' --include="kibana.jsonc" -l
```

### 2. Generate the stats file

```bash
node scripts/check_package_docs.js --plugin <pluginId> --write
# or for packages:
node scripts/check_package_docs.js --package <manifestId> --write
```

This writes `<pluginDir>/target/api_docs/stats.json` with structured issue data. Exit code 1 is expected when issues exist — that's normal.

### 3. Read and plan

Read the stats file:

```
<pluginDir>/target/api_docs/stats.json
```

The file has this shape:

```json
{
  "counts": {
    "apiCount": 145,
    "missingComments": 28,
    "missingReturns": 10,
    "paramDocMismatches": 5,
    "missingComplexTypeInfo": 8,
    "isAnyType": 3,
    "noReferences": 144,
    "missingExports": 11,
    "unnamedExports": 2
  },
  "missingComments": [
    { "id": "dashboard.SomeType", "label": "SomeType", "path": "src/.../types.ts", "type": "Interface", "lineNumber": 42, "link": "..." }
  ],
  "missingReturns": [...],
  "paramDocMismatches": [...],
  "missingComplexTypeInfo": [...],
  "isAnyType": [...],
  "noReferences": [...],
  "missingExports": [{ "source": "...", "references": [...] }],
  "unnamedExports": [{ "pluginId": "dashboard", "scope": "public", "path": "src/.../index.ts", "lineNumber": 12, "textSnippet": "export default { ... }" }]
}
```

Report a summary of the issues in a table before proceeding with fixes.

Group all issues by `path` so you edit each file once. Prioritize:
1. `missingComments` — highest volume, most impact
2. `missingReturns` — quick wins (add `@returns` to existing JSDoc)
3. `paramDocMismatches` — add missing `@param` tags so all params are documented
4. `missingComplexTypeInfo` — add JSDoc to undocumented interface, object, and union type declarations
5. `isAnyType` — replace `any` with specific types (careful: may require reading more context)
6. `unnamedExports` — skip; flag for human review (requires restructuring exports, which changes the public API surface)
7. `missingExports` — skip; flag for human review
8. `noReferences` — informational only; not a validation failure, no action required

### 4. Fix issues file by file

For each file, read it fully first, then make all edits in one pass.

#### missingComments — add JSDoc above the declaration

**Functions/methods:**
```typescript
/**
 * Cleans filters before serialization by removing empty arrays and null values.
 *
 * @param filters - Array of filter objects to sanitize.
 * @returns Cleaned filter array safe for serialization.
 */
export function cleanFiltersForSerialize(filters: Filter[]): Filter[] {
```

**Interfaces/types:**
```typescript
/**
 * Parameters for retrieving a dashboard by its saved object ID.
 */
export interface GetDashboardParams {
```

**Interface properties** (inline `/** ... */`):
```typescript
export interface DashboardLocatorParams {
  /** The saved object ID of the dashboard to navigate to. */
  dashboardId?: string;
  /** When true, the dashboard opens in view mode. */
  viewMode?: boolean;
}
```

**Constants/variables:**
```typescript
/** Maximum number of panels allowed on a single dashboard. */
export const MAX_PANELS = 100;
```

**Classes:**
```typescript
/**
 * Provides the public API for the Dashboard plugin.
 */
export class DashboardPlugin implements Plugin<DashboardPluginSetup, DashboardPluginStart> {
```

#### missingReturns — add `@returns` to existing JSDoc

Find the existing JSDoc block and add the `@returns` line before the closing `*/`. Match the actual return type:

```typescript
/**
 * Retrieves the locator params for the current dashboard state.
 *
 * @param state - Current dashboard application state.
 * @returns Locator params derived from the state, suitable for deep-linking.
 */
```

#### paramDocMismatches — complete partial `@param` documentation

This flag means some (but not all) parameters already have `@param` tags — the function has inconsistent docs. Functions where *no* params are documented are not flagged here; they fall under `missingComments` instead.

The fix is always to add the missing `@param` tags so every parameter is covered. Read the function signature and add a `@param` for each undocumented parameter:

```typescript
// Before: only `id` is documented, `includeRoles` and `timeout` are missing
/**
 * Fetches user data from the API.
 *
 * @param id - The user ID.
 */
export const getUser = (id: string, includeRoles: boolean, timeout?: number): Promise<User> => { /* ... */ };

// After: all params documented
/**
 * Fetches user data from the API.
 *
 * @param id - The user ID.
 * @param includeRoles - When true, includes the user's assigned roles in the response.
 * @param timeout - Optional request timeout in milliseconds.
 */
export const getUser = (id: string, includeRoles: boolean, timeout?: number): Promise<User> => { /* ... */ };
```

Also remove any stale `@param` entries for parameters that no longer exist in the signature.

**Destructured object parameters** — document each nested property with dot-notation tags. Every level of nesting needs its own `@param`:

```typescript
/**
 * Runs a search with the given options.
 *
 * @param query - The query object.
 * @param query.text - The search string.
 * @param query.language - Query language (e.g., `kuery`, `lucene`).
 * @param options - Runtime options.
 * @param options.signal - Abort signal for cancellation.
 */
export const runSearch = (
  query: { text: string; language: string },
  options: { signal: AbortSignal },
) => { /* ... */ };
```

For deeply nested properties, continue the dot chain as far as needed (e.g., `@param fns.fn1.foo.param - Description.`).

#### missingComplexTypeInfo — add JSDoc to undocumented complex type declarations

A prioritized subset of `missingComments` for type declarations that lack a top-level JSDoc description. Flagged: interfaces, inline object types, and union/intersection types. Excluded: primitives and functions (self-documenting or tracked elsewhere). Fixing one reduces both `missingComplexTypeInfo` and `missingComments` counts.

The fix is to add a JSDoc block to the **type declaration itself**:

```typescript
// Before — no description on SearchOptions or FilterSpec
export interface SearchOptions {
  query: string;
  filters: FilterSpec;
}

export type FilterSpec = {
  field: string;
  operator: 'eq' | 'neq';
};

// After
/**
 * Options for configuring a search request.
 */
export interface SearchOptions {
  query: string;
  filters: FilterSpec;
}

/**
 * Describes a single filter condition applied to a search query.
 */
export type FilterSpec = {
  field: string;
  operator: 'eq' | 'neq';
};
```

Inline property docs (e.g., `/** ... */` on each field) are a separate concern covered under `missingComments` for interface members.

#### unnamedExports — flag for human review

This flags an exported declaration that has no identifiable name — meaning `ts-morph` cannot call `getName()` on the node. The most common cause is an anonymous `export default` expression (e.g., `export default { ... }` or `export default function() { ... }`).

**Do not attempt to fix these.** Naming an anonymous default export or removing `export default` changes the module's public API surface, which is a runtime behavior change outside the scope of documentation fixes. Report them in the PR for a developer to handle.

#### isAnyType — replace `any` with specific types

Read the context to understand the actual type, then replace. Common patterns:

```typescript
// Before
callback: (result: any) => void
// After
callback: (result: DashboardCreationResult) => void
```

If the correct type is genuinely unknown, use `unknown` instead of `any`. Only change if you're confident — don't guess.

### 5. After each file, verify locally (optional)

For large plugins, re-run after batches of files to track progress:

```bash
node scripts/check_package_docs.js --plugin <pluginId> --write
```

Read the updated `stats.json` counts to confirm the numbers are going down.

### 6. Final verification

When all actionable issues are addressed:

```bash
node scripts/check_package_docs.js --plugin <pluginId>
```

Confirm `All packages passed validation.` (or only `missingExports` remain, which are pending human review).

Then run:

```bash
node scripts/check_changes.ts
```

### 7. PR notes

In the PR description, include:
- Before/after issue counts from `stats.json`
- Any `missingExports` or `unnamedExports` skipped (always skipped — flag for a developer)
- Any `isAnyType` items skipped because the correct type was ambiguous

## Example: full run on the dashboard plugin

```bash
# Generate stats
node scripts/check_package_docs.js --plugin dashboard --write
# Read src/platform/plugins/shared/dashboard/target/api_docs/stats.json with the Read tool

# Fix all actionable issues across the plugin files per the rules above

# Verify
node scripts/check_package_docs.js --plugin dashboard
# → "All packages passed validation."
```
