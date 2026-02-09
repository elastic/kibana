# @kbn/api-contracts

Kibana API contract validation tooling that detects breaking changes in public REST APIs by comparing current OpenAPI specifications against versioned baselines.

## Overview

This package provides CLI tools and validation logic to prevent unintentional breaking changes to Kibana's public REST APIs. It runs automatically in CI pipelines before code is merged.

**When checks run:**
- **Pull Request CI:** Validates that proposed API changes don't break existing contracts
- **Post-promotion (Serverless):** Updates serverless baseline after version promotion
- **Release branch creation (Stack):** Creates new minor version baseline

**What it protects:**
- API endpoint availability (paths and HTTP methods)
- Request/response contracts (required fields, types, structure)
- Backward compatibility for existing API consumers

## Architecture

The validation pipeline follows this data flow:

```
Load Spec → Normalize → Load Baseline → Diff → Filter Breaking → Report
```

**Key components:**

1. **`src/input/`** - Load and normalize OpenAPI specs
   - `load_oas.ts` - Parses YAML specs from disk
   - `normalize_oas.ts` - Strips non-contract elements (descriptions, examples, metadata)

2. **`src/baseline/`** - Baseline selection and loading
   - `select_baseline.ts` - Determines which baseline to compare against
   - `load_baseline.ts` - Reads baseline from disk (with graceful missing file handling)

3. **`src/diff/`** - Comparison and breaking change detection
   - `diff_oas.ts` - Deep comparison of normalized specs
   - `breaking_rules.ts` - Filters diffs for breaking changes

4. **`src/report/`** - Error formatting and user guidance
   - `format_failure.ts` - Generates actionable error reports with escalation paths
   - `links.ts` - Documentation and support links

5. **`scripts/`** - CLI entry points
   - `check_contracts.ts` - Validates current spec against baseline
   - `update_baseline.ts` - Creates/updates baseline files

## Breaking Change Rules

The following changes are considered **breaking** and will fail CI:

| Change Type | Why Breaking | Example |
|-------------|--------------|---------|
| **Path removed** | Endpoint no longer exists | `DELETE /api/saved_objects/{type}/{id}` |
| **Method removed** | HTTP verb no longer supported | Removing `POST` from `/api/fleet/agents` |
| **Response property removed** | Consumers may depend on the field | Removing `name` from response |
| **Required request property added** | Existing callers won't send new required field | Adding required `email` to POST body |
| **Required parameter added** | Existing calls won't include new required param | Adding required `version` query param |
| **Optional parameter made required** | Existing calls may not include the param | Making `filter` query param required |
| **Type changed** | Consumers expect the original type | Changing `id` from string to number |

**Non-breaking changes** (allowed):
- Adding new paths or methods
- Adding optional fields to requests/responses
- Updating descriptions, examples, or metadata
- Adding new response status codes

## Current Limitations

This implementation distinguishes between breaking and non-breaking changes at the schema level:

**What's detected correctly:**
- Adding optional properties to responses (non-breaking)
- Adding required properties to requests (breaking)
- Removing properties (breaking)
- Making optional parameters required (breaking)

**Known limitations:**
- `$ref` changes are treated as breaking even if semantically equivalent
- `allOf`/`oneOf`/`anyOf` compositions are compared structurally, not semantically
- No support for semantic versioning of individual endpoints yet
- No deprecation-aware logic yet

## Allowlist

For approved breaking changes that should be ignored, add entries to `packages/kbn-api-contracts/allowlist.json`:

```json
{
  "entries": [
    {
      "path": "/api/saved_objects/{type}/{id}",
      "method": "delete",
      "reason": "Intentional removal as part of saved objects migration",
      "approvedBy": "elastic/kibana-core",
      "prUrl": "https://github.com/elastic/kibana/pull/12345",
      "expiresAt": "2025-12-31"
    }
  ]
}
```

**Required fields:**
- `path` - API path (must match exactly)
- `method` - HTTP method (lowercase) or `ALL` for path-level changes
- `reason` - Explanation for why this is approved
- `approvedBy` - GitHub username or team

**Optional fields:**
- `prUrl` - Link to approval PR
- `expiresAt` - ISO date after which the entry should be reviewed (auto-filtered when expired)

## Usage Examples

### Check Contracts (CI/Local Development)

**Serverless:**
```bash
# Check serverless API contracts against latest baseline
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml

# Exit codes:
# 0 = No breaking changes (CI passes)
# 1 = Breaking changes detected (CI fails)
```

**Stack:**
```bash
# Check stack API contracts for current version
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution stack \
  --specPath oas_docs/output/kibana.yaml \
  --version 9.2.0

# Version is extracted from package.json in CI
KIBANA_VERSION=$(jq -r '.version' package.json)
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution stack \
  --version "$KIBANA_VERSION" \
  --specPath oas_docs/output/kibana.yaml
```

**Override baseline for testing:**
```bash
# Test against specific baseline file
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution stack \
  --version 9.2.0 \
  --baselinePath /tmp/test-baseline.yaml
```

### Update Baseline

**Serverless (Post-Promotion Pipeline Only):**
```bash
# Update serverless baseline after version promotion
# Blocked by default - requires explicit flag
node packages/kbn-api-contracts/scripts/update_baseline \
  --distribution serverless \
  --allowServerless \
  --specPath oas_docs/output/kibana.serverless.yaml
```

**Stack (Release Branch Creation):**
```bash
# Create baseline for new minor version (e.g., 9.2.0)
node packages/kbn-api-contracts/scripts/update_baseline \
  --distribution stack \
  --version 9.2.0 \
  --specPath oas_docs/output/kibana.yaml

# Creates: baselines/stack/9.2.yaml
```

## Baseline Management

### Directory Structure

```
packages/kbn-api-contracts/
└── baselines/
    ├── serverless/
    │   └── current.yaml          # Updated post-promotion
    └── stack/
        ├── 9.2.yaml               # Minor version baselines
        ├── 9.1.yaml
        └── 8.19.yaml
```

### Purpose of Baselines

Baselines are **normalized OpenAPI specifications** that represent the committed API contract for a version. They serve as the source of truth for what API consumers can depend on.

**Baseline characteristics:**
- Stored as YAML files (~hundreds of KB each)
- Version-controlled in the repository (similar to `kbn-checks-saved-objects-cli` storing field mappings)
- Stripped of non-contract metadata (descriptions, examples, tags)
- Deeply sorted for deterministic diffs

### Baseline Creation & Updates

**Stack (Minor Version Strategy):**

Each minor version gets its own baseline file (`baselines/stack/{major}.{minor}.yaml`):

1. **When created:** During release branch creation (e.g., `9.2` branch cutoff)
2. **How created:** Run `update_baseline.ts` with `--distribution stack --version 9.2.0`
3. **Version selection:** Automatically uses `{major}.{minor}` from semver (ignores patch)
4. **When updated:** Only if backporting intentional API changes (rare)
5. **Patch versions:** 9.2.1, 9.2.2, etc. all compare against `9.2.yaml`

**Example flow:**
```bash
# Release engineer creates 9.2 branch
git checkout -b 9.2
node packages/kbn-api-contracts/scripts/update_baseline --distribution stack --version 9.2.0
git add baselines/stack/9.2.yaml
git commit -m "Create API baseline for 9.2"
```

**Serverless (Current Snapshot Strategy):**

Single rolling baseline (`baselines/serverless/current.yaml`):

1. **When updated:** Post-promotion pipeline after each serverless release
2. **How updated:** Automated pipeline runs `update_baseline.ts --allowServerless`
3. **Protection:** Manual updates blocked without `--allowServerless` flag
4. **Frequency:** Every serverless promotion (~weekly)

**Serverless pipeline example:**
```yaml
# .buildkite/pipelines/serverless_promote.yml
- command: |
    node packages/kbn-api-contracts/scripts/update_baseline \
      --distribution serverless \
      --allowServerless
  label: "Update serverless API baseline"
```

### Baseline File Format

Baselines are normalized YAML matching this structure:

```yaml
openapi: 3.0.0
info:
  title: Kibana API
  version: 9.2.0
paths:
  /api/saved_objects/{type}/{id}:
    get:
      operationId: getSavedObject
      parameters: [...]
      responses: {...}
    delete:
      operationId: deleteSavedObject
      [...]
```

**What's normalized out:**
- Descriptions and summaries
- Examples and default values
- Tags and external docs
- x-extension metadata

**What's preserved:**
- All paths and methods
- Parameter definitions (required/optional, types, names)
- Request/response schemas
- Required fields and types

## CI Integration

### Buildkite Pipeline

**Location:** `.buildkite/scripts/steps/checks/api_contracts.sh`

**When it runs:**
- Every PR CI build
- Pre-merge validation
- Post-promotion pipelines (serverless baseline updates)

**What it does:**
```bash
# 1. Bootstrap dependencies
.buildkite/scripts/bootstrap.sh

# 2. Check stack contracts
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution stack \
  --version "$KIBANA_VERSION" \
  --specPath oas_docs/output/kibana.yaml

# 3. Check serverless contracts
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution serverless \
  --specPath oas_docs/output/kibana.serverless.yaml
```

### Handling Failures

**If the check fails in CI:**

1. **Review the failure report** - Identifies specific breaking changes
2. **Determine if change is intentional:**
   - **Unintentional break:** Fix the code to maintain compatibility
   - **Intentional break:** Follow API versioning process (requires label approval)

3. **For intentional breaking changes:**
   - Add `breaking-change-approved` label to PR
   - Document the breaking change in PR description
   - Update consumer documentation
   - Consider deprecation period if possible

## Troubleshooting

### "No baseline found - skipping check"

**Cause:** Baseline file doesn't exist for the version/distribution  
**Solution:**
- Stack: Ensure baseline exists for minor version (`baselines/stack/{major}.{minor}.yaml`)
- Serverless: Ensure `baselines/serverless/current.yaml` exists
- Check baseline was committed to repository

### "Invalid semver version: X"

**Cause:** Version string doesn't parse as valid semver  
**Solution:**
- Stack requires valid semver (e.g., `9.2.0`, `8.19.1`)
- Snapshots are automatically handled (`9.2.0-SNAPSHOT` → `9.2.0`)
- Verify `package.json` version is valid

### "Version is required for stack baseline selection"

**Cause:** Missing `--version` flag for stack distribution  
**Solution:**
```bash
# Always provide version for stack
node packages/kbn-api-contracts/scripts/check_contracts \
  --distribution stack \
  --version 9.2.0 \
  --specPath oas_docs/output/kibana.yaml
```

### "Serverless baseline updates are blocked"

**Cause:** Attempted manual serverless baseline update without override  
**Solution:**
- Serverless baselines are updated by post-promotion pipeline only
- For testing: use `--allowServerless` flag (not for production)
- For production: wait for automated pipeline update

### Type errors or module resolution failures

**Cause:** Dependencies not installed or stale build  
**Solution:**
```bash
# Re-bootstrap dependencies
yarn kbn bootstrap

# Type check the package
yarn test:type_check --project packages/kbn-api-contracts/tsconfig.json
```

## Documentation & Support

- **Package Documentation:** This README
- **Report Issues:** [GitHub Issues](https://github.com/elastic/kibana/issues/new)

## Testing

```bash
# Run all unit tests
yarn test:jest --config packages/kbn-api-contracts/jest.config.js packages/kbn-api-contracts --maxWorkers=2

# Run integration tests (CLI scripts)
yarn test:jest --config packages/kbn-api-contracts/jest.config.js packages/kbn-api-contracts/scripts/ --maxWorkers=2

# Type check
yarn test:type_check --project packages/kbn-api-contracts/tsconfig.json

# Lint
node scripts/eslint --fix packages/kbn-api-contracts/
```
