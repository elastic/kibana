# Lens as code: Agent Context

Lens as code is the public API for Lens visualizations and dashboards. The schemas in this folder define the API, and the transforms convert between the API and the state Lens stores in saved objects and dashboards, in both directions.

Every setting a user can configure in the Lens editor is part of this API. A feature that adds one is not done until the API supports it, in the same PR.

## Adding a setting

This covers a new key, a new value in a union, and a new nested option, in a visualization, a layer or a column. Start from the API: decide how the setting looks there before the UI is final, because a released API field cannot change. If you cannot settle it, stop and ask instead of shipping the UI alone.

A setting is supported when it has:

- **Schema**: in [`schema/`](./schema/), for example the chart's file in `schema/charts/`, or `metric_ops.ts` and `bucket_ops.ts` for a column. Cover data view and ES|QL charts where it applies. The schema descriptions become the public API docs.
- **Transforms**: both directions, state to API and API to state, in [`transforms/`](./transforms/), for example `transforms/charts/` for a chart and `transforms/columns/` for a column.
- **Tests**: in the chart's folder under [`tests/`](./tests/), a state fixture checked with `validator.<type>.fromState` and an API fixture checked with `validator.<type>.fromApi` (for example `validator.data_table.fromState`). `fromState` converts the state to the API and back and expects the same state. `fromApi` converts the API to state and back and expects every value it sent.

## Do not

- Leave a new key out of the transforms. They read keys by name, so nothing fails and the setting is silently lost.
- Silence a type error in the transforms by excluding the new value (`Exclude<…>`) or by throwing on it at export. When the export throws, the dashboards API drops the whole panel with a `dropped_panel` warning.
- Add a test that expects the export to fail.
- Hide the new setting from the round-trip tests with a normalizer `ignore` path ([`tests/utils/validator/normalizers/`](./tests/utils/validator/normalizers/)) or an `excludedFields` entry in `fromApi`. Both skip the comparison, so a lost setting still passes.

## Commands

Run from the repo root:

```bash
node scripts/jest src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder
node scripts/type_check --project src/platform/packages/shared/kbn-lens-embeddable-utils/tsconfig.json
```
