# @kbn/validate-oas

Validates the generated Kibana OAS bundles (`oas_docs/output/*.yaml`).

```bash
node ./scripts/validate_oas_docs.js --help
```

## Issue taxonomy

Every finding is classified on two axes:

- **Severity** (`error` | `warning`) — the default surface and the CI baseline gate.
- **Category** (`structural` | `quality`) — an internal drill-down, exposed via `--breakdown`.

**Policy v1** is a strict 1:1 map:

- Structural findings (schema shape, unresolved `$ref`) → `error`.
- Quality findings (missing `description` / `summary` / `example` / `examples`) → `warning`.

Compatibility findings are not part of this taxonomy; they keep a separate hard-fail path and are excluded from baseline counts.


## Default output

Per bundle the CLI prints `N errors, M warnings`. Add `--breakdown` to also print the
structural/quality subtotals within each severity bucket:

```
./oas_docs/output/kibana.yaml
  errors:   1  (structural 1, quality 0)
  warnings: 16 (structural 0, quality 16)
```

## Baseline

`oas_error_baseline.json` stores per-bundle severity counts:

```json
{
  "./oas_docs/output/kibana.yaml": { "errors": 0, "warnings": 16 }
}
```

`--assert-no-error-increase` fails (exit 1) when, for any bundle, `errors` **or** `warnings`
rises above the baseline. Compatibility issues keep their own independent hard-fail and are
excluded from the baseline severity counts. Category subtotals are computed on demand
(`--breakdown`) and are not persisted.

Regenerate the baseline with `--update-baseline`. The legacy flat `{ path: number }` format is
no longer supported; `--assert-no-error-increase` hard-fails with regeneration guidance if it
encounters it.
