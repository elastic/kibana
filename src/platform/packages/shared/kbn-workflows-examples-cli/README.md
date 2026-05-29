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
  When set, the CLI also fails if no YAML examples are found (CI misconfiguration guard).

Exits non-zero on any failure.

## What this CLI validates

- YAML syntax errors (parser-level failures).
- Examples exceeding `MAX_WORKFLOW_YAML_LENGTH`.
- Structural schema regressions on the workflow definition — top-level `name`,
  `enabled`, `triggers`, `inputs`, `settings`, `steps` — using a schema built
  from:
  - **Static connectors** via `getAllStaticConnectors()` in `@kbn/workflows`
    (Elasticsearch/Kibana built-ins, stack connectors such as `slack`, `http`,
    `inference`, `jira`, etc., and connector-specs sub-actions such as
    `virustotal.*`).
  - **Extension steps** registered by platform plugins (`data.*`, `ai.*`,
    `cases.*`, `search.rerank`, `ai.agent`) via
    `getExtensionStepContracts()`.
  - Validation runs with `loose: true` (same mode as the YAML editor).

## What this CLI does **not** validate strictly

- **`security.*` steps** (`security.buildAlertEntityGraph`,
  `security.renderAlertNarrative`): included as permissive `z.any()` placeholders
  because the security solution plugin is not importable from this platform
  package. Param drift for those step types is not caught here.
- **Dynamic connectors** resolved at runtime from the Actions client (only the
  static catalog is available offline).
- **End-to-end execution** against a running Kibana stack.

This CLI is a **merge gate** on workflow-schema changes: it catches the cheapest
classes of regression without booting Kibana. It does not replace functional or
API integration tests.

## CI behavior

On-merge validation (`.buildkite/scripts/steps/workflows/validate_examples.sh`)
runs only when the merge commit touches workflow schema paths, unless
`WORKFLOWS_VALIDATE_FORCE=true`. Upstream examples are cloned from the
`main` branch of [`elastic/workflows`](https://github.com/elastic/workflows)
at run time (no pinned ref).

## Programmatic use

```ts
import {
  runValidation,
  validateExampleYaml,
  buildWorkflowSchema,
} from '@kbn/workflows-examples-cli';
```
