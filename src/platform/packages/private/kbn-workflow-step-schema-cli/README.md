# Workflow step schema artifact generator

Generates a **superset** JSON Schema artifact for the workflow YAML document, so
CI pipelines across Elastic can lint the shared workflow example library
**without running Kibana**.

It fetches Kibana's already-composed schema over public HTTP routes, weaves in
LiquidJS template tolerance (via the shared weaver in `@kbn/workflows-yaml`), and
writes two strictly-nested variants as single self-contained documents.

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
| `--skip-completeness-check` | Skip the endpoint-vs-schema completeness gate | off |
| `--fail-on-incomplete` | Exit non-zero when a registered step/trigger is missing from the schema | off |

The command needs the Workflows read privilege (`WORKFLOW_READ_SECURITY`).

## What it discovers

Beyond connector types, the tool introspects the composed schema and reports the
**step** and **trigger** `type` discriminators it produced (counts by default,
full lists with `--list-types`). The extractor **throws** if it cannot recognize
the composed-schema shape, rather than silently emitting empty lists. The union
of these is recorded in `index.json` as `stepTypes[]` and `triggerTypes[]`, so
the artifact is self-describing.

## Completeness gate

After writing the artifact, the tool asks the *same* Kibana which step/trigger
definitions it has registered
(`GET /internal/workflows_extensions/{step,trigger}_definitions`) and asserts
every registered id is present in the produced schema (`endpoint ⊆ schema`).
This is a self-consistency check — it catches the schema dropping a registered
definition, not registry ↔ approved-fixture parity (owned by the Scout approval
tests).

The direction is deliberately one-way: the schema legitimately contains extra
`type`s the definition endpoints do not list (built-in steps like `if`/`foreach`,
Actions-derived connector steps, and built-in triggers like `alert`/`manual`).

It **warns by default** because the definition endpoints do not `await` the async
step loader, so a transient gap is possible. Use `--fail-on-incomplete` in the
canonical generation CI to make a gap fatal, or `--skip-completeness-check` to
skip it entirely.

## Variants

LiquidJS templating (`{{ }}` / `${{ }}` / `{% %}`) is part of the workflow
syntax, so **both** variants tolerate it (using the exact regexes exported from
`@kbn/workflows-yaml`, mirroring the runtime suppression predicates: `{{ }}` /
`${{ }}` anchored whole-value, `{% %}` as an unanchored substring). The only
difference is install placeholders:

- **`strict`** — composed schema + LiquidJS tolerance. For workflows and plain
  (non-installable) examples.
- **`template`** — `strict` plus the `__install__.<name>` install placeholder
  (sourced from `@kbn/workflows-library`) used by installable library templates.
  Placeholders are confined here so a plain workflow linted with `strict` cannot
  silently use them.

The LiquidJS/install alternatives are declared **once** in a shared definition
(`#/definitions/__workflowTemplateValue`) and every templated position points at
it with a single `$ref`, rather than repeating the branches inline. This keeps
the artifact small.

## Output layout

```
<output-dir>/<kibanaVersion>/<channel>/
  index.json
  strict/schema.json
  template/schema.json
```

Each `schema.json` is written minified with sorted keys — exactly the bytes a CDN
serves. `index.json` is the pretty, sorted entry point: `kibanaVersion`,
`buildHash`, `profile: "superset"`, `channel`, `connectorTypes[]`, `stepTypes[]`,
`triggerTypes[]`, and per variant `{ path, sha256 }`, where `sha256` is over the
**exact served bytes** of that variant's `schema.json`. There is no timestamp, so
an identical schema yields a byte-identical `index.json` across runs.

## Loading

Consumers read `index.json`, then fetch each variant's `schema.json` and verify
its bytes against the manifest `sha256`.

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
