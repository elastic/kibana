# ES|QL query profile

The **Query profile** view of the inspector. Open the inspector on anything that ran an ES|QL
query, pick Query profile, and it re-runs that request with `profile: true` to show where the time
went. The original request is not touched.

What it shows:

- **Summary:** total time, planning against execution, and operator time by kind of work.
- **Timeline:** one lane per driver on a shared clock, with the waits. Click a lane for its details
  and operators.
- **By command:** the share of the time that belongs to each command of your query.
- **Suggest a faster query:** asks the AI for a rewrite, and on request runs it and compares its
  time and its results with the original.

## Where things are

```
index.ts, query_profile_view*.tsx   the inspector view and its tabs
profile_summary.tsx                 the duration and operator-time bars

profile/       the ES profile turned into the view model (no UI)
timeline/      the Timeline tab and its details panel
by_command/    the By command tab: which operator belongs to which command
suggestion/    the AI suggestion, and how its results are compared
shared/        small helpers used by more than one of the above
```

The flow is `load_esql_query_profile` (runs the request) → `aggregate_esql_profile` (builds the
view model, typed in `profile/types.ts`) → the tabs. `profile/` and `shared/` never import from the
feature folders.

## Good to know

- **By command needs Elasticsearch 9.7 or later.** Every operator names the plan node it was built
  from (`plan_node_id`), and every plan node says where in the query it came from. That is the whole
  attribution: there is no matching by operator name. An older Elasticsearch has no plan nodes, so
  the tab is not shown.
- **Operator time is not CPU time.** It is the time spent inside an operator, which can include
  waiting for reads. Only a driver's own `cpu_nanos` is CPU time.
- **Lists come from the profile schema** that `@elastic/esql-definitions` publishes, not from code
  here (see `profile/profile_schema.ts`). When that package is updated and `profile_schema.test.ts`
  fails, Elasticsearch changed a field the view reads. Check it.
- **The AI suggestion** needs an enterprise license and an AI connector. It is served by
  `POST /internal/esql/optimize_query` in the `esql` plugin. The suggestion is only shown, never
  applied, and it runs only when the user asks.
- **Results are compared by fingerprint**, so rows are never kept. Decimals are rounded, whole
  numbers are not, and column types count as well as names.

## Trying it

Run a query in Discover, open the inspector (Inspect), and choose Query profile. To see the request
picker, use something that logs several ES|QL requests, such as a chart with more than one layer.

```
node scripts/jest src/platform/plugins/shared/data/public/utils/esql_query_profile
```
