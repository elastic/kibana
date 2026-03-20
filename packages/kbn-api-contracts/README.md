# @kbn/api-contracts

Detects breaking changes in Kibana's public REST APIs that affect the Terraform provider, by comparing OpenAPI specs between the PR branch and the base branch using [oasdiff](https://github.com/oasdiff/oasdiff).

## Overview

This package runs in CI on every PR. It compares the current branch's OAS files against the base branch (e.g. `main`) to detect breaking API changes, then filters to only those affecting Terraform provider APIs.

**Flow:**

```
git show base OAS → oasdiff diff → parse → filter to TF APIs → apply allowlist → report
```

**Key components:**

1. **`src/diff/`** - Breaking change detection via oasdiff

   - `run_oasdiff.ts` - Shells out to `oasdiff diff` with two OAS files
   - `parse_oasdiff.ts` - Converts oasdiff JSON output to `BreakingChange[]`
   - `breaking_rules.ts` - Allowlist filtering

2. **`src/terraform/`** - Terraform impact analysis

   - `check_terraform_impact.ts` - Matches breaking changes against TF provider APIs
   - `load_terraform_apis.ts` - Loads TF API inventory from `terraform_provider_apis.yaml`

3. **`src/report/`** - Error formatting and user guidance

   - `format_failure.ts` - Generates actionable error reports
   - `links.ts` - Documentation and support links

4. **`src/allowlist/`** - Escape hatch for approved breaking changes

   - `load_allowlist.ts` - Loads and validates `allowlist.json`

5. **`src/input/`** - OAS file loading (exported as public API)

   - `load_oas.ts` - Reads and validates OpenAPI spec YAML files

6. **`scripts/`** - CLI entry point
   - `check_contracts.ts` - Orchestrates the full pipeline

## Breaking Change Rules

oasdiff detects these as breaking:

| Change Type                   | oasdiff ID(s)                                                                 | Example                                             |
| ----------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| **Path removed**              | `api-path-removed-without-deprecation`                                        | `DELETE /api/spaces/space` removed entirely         |
| **Method removed**            | `api-removed-without-deprecation`, `api-removed-before-sunset`                | `POST` removed from `/api/fleet/agents`             |
| **Request property removed**  | `request-property-removed` ⚠️                                                 | Request body field `name` removed                   |
| **Parameter removed**         | `request-parameter-removed` ⚠️                                                | Query param `filter` removed from `GET /api/agents` |
| **Response property removed** | `response-required-property-removed`, `response-optional-property-removed` ⚠️ | Response field `id` removed from `200` response     |
| **Required property added**   | `new-required-request-property`                                               | New required `email` field on request body          |
| **Optional made required**    | `request-parameter-became-required`                                           | `filter` query param becomes required               |
| **Type changed**              | `response-property-type-changed`                                              | `id` changed from string to number                  |

⚠️ oasdiff classifies these as warnings, but they are promoted to blocking here because Terraform provider configurations depend on these fields.

## Allowlist

For approved breaking changes, add entries to `allowlist.json`:

```json
{
  "entries": [
    {
      "path": "/api/saved_objects/{type}/{id}",
      "method": "delete",
      "reason": "Intentional removal as part of saved objects migration",
      "approvedBy": "elastic/kibana-core",
      "prUrl": "https://github.com/elastic/kibana/pull/12345",
      "expiresAt": "2026-12-31"
    }
  ]
}
```

**Required fields:** `path`, `method`, `reason`, `approvedBy`
**Optional fields:** `prUrl`, `expiresAt`

## Usage

### CI (automatic)

Runs via `.buildkite/scripts/steps/checks/api_contracts.sh` on every PR. Compares against `$BUILDKITE_PULL_REQUEST_BASE_BRANCH` (defaults to `main`).

### Local development

```bash
# Check stack contracts against main
node scripts/check_api_contracts.js \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml

# Check serverless contracts against a specific commit
node scripts/check_api_contracts.js \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml \
  --mergeBase <commit-sha>
```

**Flags:**

- `--distribution` (required) - `stack` or `serverless`
- `--specPath` - Path to current OAS file (auto-detected from distribution)
- `--baseBranch` - Branch to compare against (default: `main`)
- `--mergeBase` - Merge base commit SHA (used in CI, skips remote resolution)
- `--allowlistPath` - Override allowlist path
- `--terraformApisPath` - Override TF API inventory path

**Prerequisites:** oasdiff must be installed and available in PATH (or set `OASDIFF_BIN`):

```bash
brew install oasdiff
# or: curl -fsSL https://raw.githubusercontent.com/oasdiff/oasdiff/main/install.sh | sh
```

## Handling CI Failures

1. **Review the report** - identifies which endpoints and what changed
2. **If unintentional:** fix the code to maintain compatibility
3. **If intentional:** add an allowlist entry with team approval

## Troubleshooting

### "No base OAS found - skipping check"

The base branch OAS file isn't available. This happens on:

- First PR to a new branch before `oas_docs/output/` is committed
- Shallow clones missing the base ref

The script auto-detects the `elastic/kibana` remote (falls back to `origin`) and tries `git fetch {remote} {branch} --depth=1` as a fallback. If `--mergeBase` is provided, remote resolution is skipped entirely.

### oasdiff not found

Install oasdiff locally or set `OASDIFF_BIN` to the binary path. In CI, oasdiff is pre-installed on the agent image.

### Type errors or module resolution failures

```bash
yarn kbn bootstrap
yarn test:type_check --project packages/kbn-api-contracts/tsconfig.json
```

## Testing

```bash
# Unit tests
yarn test:jest packages/kbn-api-contracts

# Type check
yarn test:type_check --project packages/kbn-api-contracts/tsconfig.json
```
