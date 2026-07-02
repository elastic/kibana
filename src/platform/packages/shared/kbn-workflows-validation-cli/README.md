# @kbn/workflows-validation-cli

Static validation for workflow YAML examples.

Used in CI to detect when YAML parsing or basic schema constraints break the
example workflows published in
[`elastic/workflows`](https://github.com/elastic/workflows). Runs without
booting Kibana.

## Usage

```
node scripts/validate_workflow_examples --dir <path-to-examples> [--template|--plain] [--junit-out <path>]
```

- `--dir` (required): directory of `.yml`/`.yaml` files. Walked recursively;
  dotfiles and hidden directories are skipped.
- `--template` (optional): validate every YAML as a template workflow — must
  contain a `template-metadata` block. Fails if any file is not a template.
  Mutually exclusive with `--plain`.
- `--plain` (optional): validate every YAML as a plain workflow implementation.
  Fails if any file contains a `template-metadata` block.
  Mutually exclusive with `--template`.
- (default, no flag): auto-detect per file — files with a `template-metadata`
  root key are validated as templates; all others as plain workflows.
- `--junit-out` (optional): writes a JUnit XML report for Buildkite to pick up.
  When set, the CLI also fails if no YAML examples are found (CI misconfiguration guard).

Exits non-zero on any failure.

## What this CLI validates

### Plain workflow files

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

### Template workflow files

A template workflow is a normal workflow body plus a `template-metadata` root
block. Auto-detection keys off the **presence** of that block (regardless of
validity). Template mode validates:

- All of the above plain-workflow checks (body validation).
- The `template-metadata` block against the `TemplateMetadataSchema`:
  - `slug` — lowercase, alphanumeric, dash-separated (regex
    `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`).
  - `version` — valid semver string (e.g. `1.0.0`).
  - `availability` — valid semver range (e.g. `>=9.5.0 <9.6.0`).
  - `name`, `description` — required strings.
  - `categories` — required non-empty array of strings.
  - `solutions` — optional array of strings.
  - `install` — optional install-form definition (field types, options,
    defaults); validated in full including field-type constraints.
  - Unknown keys in `template-metadata` are rejected (strict mode).
- Issues from both blocks are reported together in a single pass.

> **Note on auto mode and the `elastic/workflows` repo:** Today no examples in
> that repository contain a `template-metadata` block, so auto mode behaves
> identically to the previous plain-only validation. Once template workflows
> land in `elastic/workflows`, auto mode will start validating their metadata
> strictly — this is the intended behavior, not a breaking change.

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
at run time (no pinned ref). The CI step uses **auto mode** (no flag) so it
handles mixed directories of plain and template examples correctly.

## Programmatic use

```ts
import {
  runValidation,
  validateExampleYaml,
  buildWorkflowSchema,
} from '@kbn/workflows-validation-cli';
import type { ValidationMode } from '@kbn/workflows-validation-cli';
```
