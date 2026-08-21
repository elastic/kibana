# @kbn/validate-oas

Validates the generated Kibana OAS bundles (`oas_docs/output/*.yaml`).

```bash
node ./scripts/validate_oas_docs.js --help
```

## Issue taxonomy

Every finding is classified on two axes:

- **Severity** (`error` | `warning`) — the default surface and the CI baseline gate.
- **Category** (`structural` | `quality`) — how the finding was classified (not persisted in the baseline).

**Policy v1:**

- Structural findings (schema shape, unresolved `$ref`) → `error`.
- Quality findings for missing `summary` / `example` / `examples` → `error`.
- Quality findings for missing `description` → `warning`.

Compatibility findings are not part of this taxonomy; they keep a separate hard-fail path and are excluded from baseline counts.

## Default output

Per bundle the CLI prints `N errors, M warnings`.

## Baseline

`oas_error_baseline.json` stores per-bundle severity counts:

```json
{
  "./oas_docs/output/kibana.yaml": { "errors": 16, "warnings": 0 }
}
```

`--assert-no-error-increase` fails (exit 1) when, for any bundle, `errors` **or** `warnings`
rises above the baseline. Compatibility issues keep their own independent hard-fail and are
excluded from the baseline severity counts.

Regenerate the baseline with `--update-baseline`.
