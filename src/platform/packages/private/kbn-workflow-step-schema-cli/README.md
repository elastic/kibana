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

### Discriminated `steps` / `triggers` unions

Both variants ship the `steps` and `triggers` unions with an OpenAPI-style
`discriminator` (`{ "propertyName": "type" }`) and each branch's `type` collapsed
to a bare `const`/`enum`. This lets ajv (and other draft-07 consumers with
discriminator support) validate an item against **only** its `type`'s branch —
`O(#steps)` instead of `O(#steps × #branches)` — and produce branch-anchored
errors instead of a giant `oneOf` dump. The trade-off is that the discriminator
itself cannot be templated: a step whose `type` is a `{{ … }}` / `__install__`
placeholder is rejected. Every other value position keeps its template tolerance.

The transform is applied all-or-nothing per union: if a branch has no
determinable `type` literal, or two branches would map to the same tag, the
`discriminator` is omitted and the union stays a plain `oneOf`/`anyOf`.

## Output layout

```
<output-dir>/<kibanaVersion>/<channel>/
  index.json
  strict/schema.json
  template/schema.json
```

Each `schema.json` is written minified with sorted keys — exactly the bytes a CDN
serves. `index.json` is the pretty, sorted entry point: `kibanaVersion`,
`buildHash`, `profile: "superset"`, `connectorTypes[]`, `stepTypes[]`,
`triggerTypes[]`, and per variant `{ path, sha256 }`, where `sha256` is over the
**exact served bytes** of that variant's `schema.json`. There is no timestamp, so
an identical schema yields a byte-identical `index.json` across runs. The
`channel` field is absent from the committed copy and stamped at CDN publish time.

## Loading

Consumers read `index.json`, then fetch each variant's `schema.json` and verify
its bytes against the manifest `sha256`.

## CI generation and CDN publishing

The artifact is generated in CI and committed to the repo, then published to the
CDN from the release/serverless build pipelines.

### Generation (committed to the repo)

The generation is a Jest integration test
(`integration_tests/generate_schema.test.ts`), following the same convention as
the encrypted-saved-objects `ci_checks` integration test. It boots a real,
all-solutions Kibana (`createRootWithCorePlugins({}, { oss: false })` over a
trial-license ES), generates the artifact in-process using this package's own
modules (the same steps the CLI runs), and writes the committed artifact directly
to a single channel-agnostic bundle:

```
generated/{index.json,strict/schema.json,template/schema.json}
```

The `kibanaVersion`, `buildHash`, and `channel` fields are omitted from the
committed `index.json` and stamped at CDN publish time by `publish_schema.sh`.
The output is otherwise deterministic and timestamp-free, so re-generation is a
no-op unless the schema actually changed. Determinism is achieved through two
layers:

1. **Pre-composition ordering.** Connector and trigger arrays are sorted by their
   `type` discriminator before `z.toJSONSchema()` runs, pinning the
   `__schemaN` reference-definition numbering that Zod v4 assigns in traversal
   order. This ensures re-ordering of async step-loader resolution never
   produces a whole-file diff.
2. **Post-serialization canonicalization.** The writer sorts members of
   `anyOf`, `oneOf`, and `required` arrays by stable-stringified content before
   hashing, as a belt-and-braces guard. `enum` and `allOf` are intentionally
   excluded: `enum` order is curated (e.g. severity levels), and `allOf` has no
   ordering benefit here.

The config runs exclusively via
`.buildkite/scripts/steps/code_generation/workflow_step_schema_codegen.sh`,
wired into the `Checks` pipeline step (`checks.sh`). It is excluded from the
regular Jest integration lane via `.buildkite/disabled_jest_configs.json` to
avoid a redundant double boot. Any drift is auto-committed back to the PR inline
by `check_for_changed_files`. Set `WORKFLOW_SCHEMA_OUTPUT_DIR` to write
elsewhere (e.g. under the gitignored `target/`) when experimenting locally.

### CDN layout

Published to the workflows CDN bucket (`elastic-workflows-library-prod`, served
at `https://workflows.elastic.co`) under a `/schema/v1` prefix, a sibling of the
Workflow Template Library's `/library` prefix:

```
schema/v1/<version>/release/{index.json,strict/schema.json,template/schema.json}
schema/v1/serverless/{index.json,strict/schema.json,template/schema.json}
```

- **Release** (`.buildkite/scripts/steps/artifacts/upload_dra_pipeline.sh`, gated on
  `RELEASE_BUILD=true`, `depends_on: dra-prep`): version cut, every RC, and GA
  overwrite `schema/v1/<version>/release`. Nightly snapshots are not published.
- **Serverless** (`.buildkite/scripts/steps/artifacts/docker_image.sh`, on the
  main-branch image promotion): rolling overwrite of `schema/v1/serverless`.

Both call the shared `.buildkite/scripts/steps/workflow_step_schema/publish_schema.sh`,
which reads the GCS service-account key from `GCS_SA_CDN_KEY` (exported by
`setup_job_env.sh`), stamps the real `kibanaVersion`, `buildHash`, and `channel` onto the
published `index.json` (the committed copy omits all three), and `gcloud storage rsync`s
the bytes with `cache-control: public, max-age=300`.

The CDN publish is `soft_fail` on both paths; a Buildkite warning annotation is emitted
on failure so the CDN staleness is visible without trawling job logs.

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
