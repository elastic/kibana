# Lens attribute normalizers (test-only)

This directory is **only used by tests**. Nothing here runs in production or ships with the Lens config builder.

## Why it exists

Strict round-trip checks (`LensAttributes` → API format → `LensAttributes`) compare the original saved-object attributes to the attributes rebuilt by `LensConfigBuilder.fromAPIFormat`.

That round trip is intentionally lossy in places:

- Column and layer IDs are remapped to deterministic names
- Defaults are filled in where the original omitted them
- Legacy / deprecated fields are dropped or renamed
- Runtime-only or SO-envelope fields are stripped

Without normalization, every fixture would fail equality checks for those expected differences. Normalizers rewrite **original** and/or **transformed** attributes (and optionally ignore paths) so the remaining shape can be compared with `toEqual`.

They are wired from `validate_state_transforms.ts` via `getChartNormalizer(chartType)` when a chart type is in the strict set.

## How a normalizer works

1. Take `{ original, transformed }` Lens attributes.
2. Apply chart-specific configs (often composed with `getCommonNormalizer` from `common.ts`).
3. Optionally unset noisy paths (`ignore`).
4. Assert `normalized.transformed` equals `normalized.original`.

`normalize.ts` provides the composition primitives (`normalize`, `mergeNormalizers`, `ignorePaths`). Chart files export a single `normalize*` function; `index.ts` maps chart types to those exports.

## Files

| File | Role |
|------|------|
| `normalize.ts` | Shared types and merge / ignore helpers |
| `common.ts` | Cross-chart cleanups (IDs, filters, formats, palettes, color mappings, …) |
| `index.ts` | Chart-type → normalizer registry |
| `xy.ts`, `metric.ts`, `datatable.ts`, … | Visualization-specific alignment |
| `normalize.test.ts` | Unit tests for the merge / ignore helpers |
