# Workflow YAML validator

Validates workflow YAML (a single file or a folder of files) against the
generated workflow step JSON Schema artifact produced by
`@kbn/workflow-step-schema-cli`, **without running Kibana**.

It is the linting counterpart to `scripts/generate_workflow_step_schemas.js`:
the generator produces the schema artifact, this tool consumes it.

## Usage

```bash
node scripts/validate_workflow_yaml.js <file-or-dir> [flags]

# validate every workflow in a folder, recursively, against the local artifact
node scripts/validate_workflow_yaml.js ./examples --recursive

# validate a single file against an explicit schema (path or URL)
node scripts/validate_workflow_yaml.js ./my-workflow.yaml \
  --schema ./target/workflow_step_schemas/9.6.0/release
```

Flags:

| Flag | Description | Default |
| --- | --- | --- |
| `--recursive` / `-r` | Descend into subdirectories | off (top-level only) |
| `--summary-only` | Suppress per-file streaming; print only failures and the final summary | off (stream every file) |
| `--variant` | Force a schema variant: `strict` or `template` | auto-detect per file |
| `--schema` | Explicit schema source: a bundle directory or an `http(s)://` base URL | — |
| `--schema-cdn-url` | CDN base URL used as a fallback (also `KBN_WORKFLOW_SCHEMA_CDN_URL`) | — |
| `--kibana-version` | Select a version under the local target dir | highest available |
| `--channel` | Select a channel under the local target dir | `release` |
| `--json` | Write a structured JSON report to this path | — |

The positional argument may be a single `.yml`/`.yaml` file or a directory.
Directories are scanned non-recursively unless `--recursive` is passed; dotfiles
are skipped.

## Schema source resolution

The schema artifact (the directory containing `index.json`) is resolved in
order:

1. `--schema <path|url>` when provided (auto-detects a filesystem path vs an
   `http(s)://` base URL).
2. The local `target/workflow_step_schemas/<version>/<channel>` bundle, using
   `--kibana-version` / `--channel` (defaulting to the highest available version
   and the `release` channel).
3. `--schema-cdn-url` (or the `KBN_WORKFLOW_SCHEMA_CDN_URL` env var) as a
   fallback. There is no built-in default, so the CDN fallback is only used when
   configured.

Each variant's `schema.json` is verified against the `sha256` recorded in
`index.json` before use.

## What it checks

Three layers run per file:

1. **JSON Schema** — the document is validated with `ajv` (draft-07) against the
   `strict` or `template` variant. Plain workflows use `strict`; installable
   templates (files with a `template-metadata` block) have that block validated
   with the strict template-metadata schema, stripped, and the remaining body
   validated against `template`. `--variant` forces a specific variant.
2. **Semantic** — step-name uniqueness and execution-graph (DAG) validity, reusing
   Kibana's own `validateStepNameUniqueness` and `WorkflowGraph`. Runs only when
   the JSON Schema layer passed for that file.
3. **LiquidJS syntax** — every `{{ }}` / `{% %}` scalar is parsed with the real
   LiquidJS engine. Runs unconditionally.

The process exits non-zero if any file has an error. An empty folder logs a
warning and exits 0.

### Readable schema errors

The generator ships the `steps`/`triggers` unions with an OpenAPI-style
`discriminator` keyed on `type`, so ajv's native discriminator support validates
each step against **only** its `type`'s branch instead of every connector's
branch. That anchors errors precisely at their source (e.g. `steps.3.with`) with
no cross-branch explosion, so the reporter only has to tidy the residual noise:

- **Names unknown step types.** A `type` that matches no branch surfaces as a
  single `steps.0.type: unknown step type "…"` (ajv's `discriminator` error),
  not the whole union's "must have required property …" noise.
- **Prunes template-value branch noise.** Value positions are often
  `anyOf: [<real schema>, <Liquid template value>]`, so a real violation (e.g. an
  unknown `with` key) is reported alongside redundant "must be string" / "must
  match a schema in anyOf" lines — these are dropped when a specific error exists
  at the same location.
- **Prunes ancestor wrapper noise.** The tolerant `steps`/`with` `anyOf` wrappers
  also fire one level up when a nested value fails; the deeper, specific error is
  kept and the ancestor wrapper noise is dropped.
- **Dedupes and caps** the remaining errors per file (with a `... and N more`
  note).

If a step's `type` is itself a `{{ … }}` / `__install__.<name>` placeholder it is
no longer accepted, because the discriminator must read a concrete `type` to pick
a branch. All other value positions keep their template tolerance.

### Deeply-nested workflows

The step schema is deeply recursive (steps nest steps), and `ajv` compiles it
into a validator that consumes a large slice of the call stack per nesting level.
Validating on the main thread would overflow the stack after only a few levels,
because the main thread's stack is capped by the OS thread stack (~8 MB).

To avoid that, the schema is compiled and validated inside a **worker thread**
whose stack is sized explicitly (`resourceLimits.stackSizeMb`, 128 MB by
default). That comfortably validates thousands of nesting levels — far beyond any
real workflow. If a pathologically deep document still overflows even the
enlarged stack, it is reported as a single actionable
`Schema validation could not complete (document too deeply nested for the schema)`
issue rather than crashing the process.

## Limitations

- Liquid **semantic** correctness (whether referenced variables/steps resolve) is
  not checked — only syntax.
- Trigger `eventSchema` payload contracts and `on.condition` KQL are not checked.
- The schema is a permissive superset, so it does not catch "step X is
  unsupported in flavor Y".
