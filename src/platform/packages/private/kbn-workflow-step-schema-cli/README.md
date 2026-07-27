# Workflow step schema artifact generator

Generates a **superset** JSON Schema artifact for the workflow YAML document, so
CI pipelines across Elastic can lint the shared workflow example library
**without running Kibana**.

It fetches Kibana's already-composed schema over public HTTP routes, weaves in
LiquidJS template tolerance, and writes two strictly-nested variants. Each
variant is measured and written as a single self-contained document.

## Usage

Point it at a **superset** deployment: stateful, all solution groups loaded,
enterprise license active, and step feature flags on (e.g.
`securitySolution.attackDiscoveryWorkflowsEnabled`). That guarantees the union of
steps, connectors, and triggers is complete.

```bash
node scripts/generate_workflow_step_schemas.js \
  --kibana-url http://localhost:5601 \
  --username elastic --password changeme \
  --output-dir ./target/workflow_step_schemas \
  --channel release
```

Flags:

| Flag | Description | Default |
| --- | --- | --- |
| `--kibana-url` | Kibana base URL | `http://localhost:5601` |
| `--space` | Kibana space id | `default` |
| `--username` / `--password` | Basic auth (both required together) | — |
| `--api-key` | API key (alternative to username/password) | — |
| `--output-dir` | Output directory | `<repo>/target/workflow_step_schemas` |
| `--channel` | `release` or `serverless` | `release` |
| `--kibana-version` | Override version | from `/api/status` |
| `--build-hash` | Override build hash | from `/api/status` |
| `--list-types` | Log the full sorted connector/step/trigger type lists | off |
| `--skip-fixture-check` | Skip comparing produced types against the approved fixtures | off |
| `--fixtures-dir` | Override the approved-definitions fixtures directory | `workflows_extensions` Scout fixtures |
| `--fail-on-fixture-deviation` | Exit non-zero when approved steps/triggers are missing | off |

The command needs the Workflows read privilege (`WORKFLOW_READ_SECURITY`).

## What it discovers

Beyond connector types, the tool introspects the composed schema and reports the
**step** and **trigger** `type` discriminators it produced (counts by default,
full lists with `--list-types`). The union of these is recorded in `index.json`
as `stepTypes[]` and `triggerTypes[]`, so the artifact is self-describing.

## Fixture deviation check

After writing the artifact, the tool compares the produced step/trigger types
against the approved definitions in the `workflows_extensions` Scout fixtures
(`approved_step_definitions/*.txt` and `approved_trigger_definitions.ts`) and
logs any deviation:

- **Missing** — an approved step/trigger that is absent from the artifact. This
  is the actionable signal (the source Kibana did not register it, so either a
  feature flag/plugin was off, or the fixtures are ahead of the code). Enable
  `--fail-on-fixture-deviation` to make this exit non-zero (useful in CI).
- **Unexpected** — a produced type not in the approved list. For triggers this
  is surfaced (the approved trigger list is a governed allowlist; built-ins like
  `alert`/`manual`/`scheduled` are expected). For steps only a count is shown,
  since the artifact intentionally includes many built-ins and connectors beyond
  the approved set.

Skip it with `--skip-fixture-check` (e.g. when generating against a deployment
that intentionally has a reduced feature set).

## Variants

LiquidJS templating (`{{ }}` / `${{ }}` / `{% %}`) is part of the workflow
syntax, so **both** variants tolerate it (using the exact regexes exported from
`@kbn/workflows-yaml`). The only difference is install placeholders:

- **`strict`** — composed schema + LiquidJS tolerance in non-string typed value
  positions. For workflows and plain (non-installable) examples.
- **`template`** — `strict` plus the `__install__.<name>` install placeholder
  used by installable library templates. Placeholders are confined here so a
  plain workflow linted with `strict` cannot silently use them.

The LiquidJS/install alternatives are declared **once** in a shared definition
(`#/definitions/__workflowTemplateValue`) and every templated position points at
it with a single `$ref`, rather than repeating the branches inline. This keeps
the artifact small.

## Measured sizes

Each variant is emitted as a single `schema.json` and its size is recorded
(minified + gzip) in `index.json` and logged. Chunking was removed while the
artifact sits well under any practical size threshold; the measurement stays so
it can be re-introduced from data if a variant ever grows large enough to
warrant it.

## Output layout

```
<output-dir>/<kibanaVersion>/<channel>/
  index.json
  strict/schema.json
  template/schema.json
```

`index.json` is the entry point: `kibanaVersion`, `buildHash`,
`profile: "superset"`, `channel`, `generatedAt`, `connectorTypes[]`,
`stepTypes[]`, `triggerTypes[]`, and per variant
`{ path, sizeBytes, gzipBytes, sha256, defsCount, unionBranchCount }`. Files use
sorted keys for stable diffs.

## Loading

Consumers should use `loadVariantSchema(manifest, variant, reader)` (exported
from this package). It reads `index.json`, verifies the variant's `sha256`, and
returns the JSON Schema document.

## Limitations (accepted)

- **Permissive superset**: accepts any step that exists in *some* flavor. It does
  not catch "step X is unsupported in flavor Y" — that is enforced by
  library-level example filtering and by the target deployment at author/run
  time.
- **Non-schema validation not covered**: step-name uniqueness, graph/DAG
  validity, and LiquidJS expression correctness live in Kibana's
  `validateWorkflowYaml`, not expressible in JSON Schema.
- **Triggers**: trigger `type` (built-in + registered custom ids) and the `on`
  block shape are validated, but a custom trigger's `eventSchema` payload
  contract and `on.condition` KQL are not.
- Fully-dynamic third-party connectors with no static schema appear only as
  loosely-typed steps.
- Both variants permit placeholders but do not verify their contents.
