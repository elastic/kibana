# @kbn/data-source

A uniform abstraction over data sources in Kibana — DSL (index-pattern-backed) and ES|QL — so that consumers like Discover, Lens, and Dashboards share a single code path for rendering, filtering, and identifying data.

## The problem

`DataView` does three jobs: identity, index schema (`_field_caps`), and result-column metadata. ES|QL only needs the first. Today that mismatch is papered over with adhoc DataViews, a parallel `columnsMeta` structure, and scattered `if (isEsqlMode)` branches across the codebase.

## The abstraction

```
Consumers ──→ DataSource ──┬──→ DataViewSource ──→ DataView
                            └──→ EsqlSource
```

`DataSource` is the contract every consumer depends on. Two implementations:

- **`DataViewSource`** — thin wrapper around an existing `DataView`. Used for DSL. Every property delegates directly to the underlying DataView; consumers that need DSL-specific features (runtime fields, scripted fields, `searchSource`) call `getDataView()`.
- **`EsqlSource`** — built directly from `(query, resultColumns)`. No DataView underneath, no `_field_caps` call. Identity is `esql-{sha256}` — the `esql-` prefix sits outside the hash so `DataSourceService` can discriminate ES|QL ids without inspecting the registry.

Both implementations satisfy `DataViewBase` from `@kbn/es-query`, so filter utilities (`buildEsQuery`, `getDisplayValueFromFilter`, `filter_matches_index`) accept a `DataSource` directly.

## Key design rules

1. `Column` is the minimum union both implementations can provide. It intentionally excludes `searchable`, `aggregatable`, `runtimeField`, etc. — DSL consumers that need those narrow to `DataViewSource` and call `getDataView()`.
2. `isTimeBased()` returns `!!timeFieldName`. It must never introspect the fields/columns array.
3. `EsqlSource` must never call `_field_caps`.
4. `serialize()` returns identity only. Columns are runtime state — rehydration re-derives them from the query result (ES|QL) or DataView refresh (DSL).

## Usage

```ts
import { EsqlSource, DataViewSource, DataSourceService } from '@kbn/data-source';

// ES|QL — constructed from the query result
const source = await EsqlSource.create({
  query: 'FROM logs-* | LIMIT 10',
  resultColumns: datatableColumns,
  timeFieldName: '@timestamp',
  projectRouting,           // optional, isolates ids per CPS project
});

// DSL — thin wrapper around an existing DataView
const source = new DataViewSource(dataView);

// Polymorphic column access — same call for both
const col = source.getColumn('host.name');  // Column | undefined
const all = source.getColumns();            // readonly Column[]

// DSL-specific access (narrows to DataViewSource)
if (source instanceof DataViewSource) {
  const field = source.getDataView().getFieldByName('host.name');
}
```

## `DataSourceService`

A registry that resolves any data-source id to a `DataSource`, replacing direct `dataViewsService.get(id)` calls in cross-cutting consumers (filter pills, etc.).

```ts
const service = new DataSourceService(dataViewsService);

// Registration is consumer-owned
service.registerEsqlSource(esqlSource);      // call after each fetch
service.unregisterEsqlSource(esqlSource.id); // call on teardown

// Polymorphic lookup — works for both DSL and ES|QL ids
const source = await service.get(someId);

// Synchronous shortcut when you already have a DataView in hand
const source = service.fromDataView(dataView);
```

## `cache_adapter`

A transitional shim that registers an `EsqlSource` as a thin DataView in the `dataViewsService` cache, so consumers that haven't yet migrated to `DataSourceService` keep working. Delete once all such consumers migrate to `DataSourceService.get()`.

## Serialization

`serialize()` returns identity only — no columns, no fields:

```ts
// ES|QL
{ kind: 'esql', id, title, timeFieldName, references }

// DSL
{ kind: 'index-pattern', id, references }
```

Columns are always re-derived at runtime. No saved-object migration is needed.
