# ES|QL query profile

The **Query profile** view of the inspector. Open the inspector on anything that ran an ES|QL
query, pick Query profile, and it re-runs that request with `profile: true` to show where the time
went. The original request is not touched.

What it shows:

- **Summary:** total time, planning against execution, and operator time by kind of work.
- **Timeline:** one lane per driver on a shared clock, with the waits. Click a lane for its details
  and operators.

## Where things are

```
index.ts, query_profile_view*.tsx   the inspector view
profile_summary.tsx                 the duration and operator-time bars
esql_inspector_requests.ts          which inspector requests are ES|QL

profile/       the ES profile turned into the view model (no UI)
timeline/      the Timeline and its details panel
shared/        small helpers used by more than one of the above
```

The flow is `load_esql_query_profile` (runs the request) → `aggregate_esql_profile` (builds the
view model, typed in `profile/types.ts`) → the view. `profile/` and `shared/` never import from the
feature folders.

## Good to know

- **Operator time is not CPU time.** It is the time spent inside an operator, which can include
  waiting for reads. Only a driver's own `cpu_nanos` is CPU time.
- **Lists come from the profile schema** that `@elastic/esql-definitions` publishes, not from code
  here (see `profile/profile_schema.ts`). When that package is updated and `profile_schema.test.ts`
  fails, Elasticsearch changed a field the view reads. Check it.
- **Request names are the ones the Requests view shows**, numbered when two share a name.

## Trying it

Run a query in Discover, open the inspector (Inspect), and choose Query profile. To see the request
picker, use something that logs several ES|QL requests, such as a chart with more than one layer.

```
node scripts/jest src/platform/plugins/shared/data/public/utils/esql_query_profile
```
