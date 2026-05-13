# @kbn/workflows-examples-cli

Static validation for workflow YAML examples.

Used in CI to detect when YAML parsing or basic schema constraints break the
example workflows published in
[`elastic/workflows`](https://github.com/elastic/workflows). Runs without
booting Kibana.

## Usage

```
node scripts/validate_workflow_examples --dir <path-to-examples> [--junit-out <path>]
```

- `--dir` (required): directory of `.yml`/`.yaml` files. Walked recursively;
  dotfiles and hidden directories are skipped.
- `--junit-out` (optional): writes a JUnit XML report for Buildkite to pick up.

Exits non-zero on any failure.

## What this CLI actually catches

- YAML syntax errors (parser-level failures).
- Examples exceeding `MAX_WORKFLOW_YAML_LENGTH`.
- Structural schema regressions on the **public** workflow definition —
  top-level `name`, `enabled`, `triggers`, `inputs`, `settings`, `steps` —
  built from `getElasticsearchConnectors()` + `getKibanaConnectors()` with
  `loose: true`.

## What this CLI does **not** catch

Step types contributed by the `workflows_management` plugin's
`stack_connectors_schema` (`slack`, `http`, `inference`, `virustotal`,
`ai.agent`, `kibana.*` sub-actions, etc.) are *not* visible from this package.
The CLI treats unknown step types as schema errors, so any example using one
of those step types **will fail** static validation here.

For real coverage of connector params drift and step-type renames, examples
must be exercised against a running Kibana with the plugin's full schema.

This CLI is therefore a **fast-fail gate**: it catches the cheapest classes of
regression on every PR without needing a Kibana stack. It does not replace
end-to-end validation.

## Programmatic use

```ts
import {
  runValidation,
  validateExampleYaml,
  buildWorkflowSchema,
} from '@kbn/workflows-examples-cli';
```
