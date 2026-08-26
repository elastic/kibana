# @kbn/connector-cli

CLI tool for bulk-creating testing connector instances in a running Kibana.

## Quick Start

```bash
# Prerequisites
vault login --method oidc                    # One-time Vault authentication
yarn es snapshot                             # Start Elasticsearch (separate terminal)
yarn start                                   # Start Kibana (separate terminal)

# Create all enabled connectors
node scripts/create_connectors.js

# Preview without creating anything
node scripts/create_connectors.js --dry-run
```

## How It Works

The script reads YAML manifest files from `src/manifests/`, fetches credentials from Vault, and calls `POST /api/actions/connector` for each one. Connectors are named with a `(testing)` suffix and the script is idempotent — re-running it skips connectors that already exist.

## Manifest Format

Each YAML file in `src/manifests/` describes one connector:

```yaml
# Optional: set to false to skip this manifest
enabled: false

# The connector type ID from kbn-connector-specs metadata.id
spec_id: .slack2

# Display name (must include "(testing)" suffix for idempotency matching)
name: "Slack (testing)"

# Auth type — must be one the spec actually declares in auth.types[]
auth_type: bearer

# Optional connector config fields
config:
  serverUrl: "https://example.com"

# Secret fields — each is either a static value or a vault reference
secrets:
  token:
    vault: secret/ent-search-team/connectors-sources/slack
    field: token
```

### Secret field types

**Static value** — hardcoded directly in the manifest (for URLs, scopes, etc.):
```yaml
secrets:
  tokenUrl:
    value: "https://accounts.google.com/o/oauth2/v2/auth"
```

**Vault reference** — fetched at runtime via `vault read -field <field> <path>`:
```yaml
secrets:
  token:
    vault: secret/ent-search-team/connectors-sources/slack
    field: token
```

### Enabling and disabling manifests

Add `enabled: false` at the top level to skip a manifest. The script reports disabled manifests in its count but doesn't attempt to create them or fetch their secrets.

```yaml
# Why disabled: waiting for vault entry (search-team#13913)
enabled: false
spec_id: .github
name: "GitHub (testing)"
...
```

To re-enable, remove the `enabled: false` line (or set it to `true`).

### Common gotchas

**Connector type IDs have inconsistent naming.** The `spec_id` must match the spec's `metadata.id` exactly — not the directory name or export name. Examples:
- Directory `brave_search/` → spec ID `.brave-search` (hyphen, not underscore)
- Directory `one_password/` → spec ID `.1password`
- Directory `pagerduty/` → spec ID `.pagerduty_mcp`

Run `node scripts/create_connectors.js --dry-run` to verify IDs are correct before creating.

**`api_key_header` secrets use normalized field names.** Instead of `{ headerField: "X-Api-Key", apiKey: "..." }`, the API expects the header name as the key: `{ "X-Api-Key": "..." }`. Check the spec's `auth.types[].defaults.headerField` for the correct key name.

**`authType` must match the spec's declared auth types.** The server validates secrets as a discriminated union on `authType`. If a spec declares `['bearer', 'oauth_authorization_code']`, sending `authType: 'oauth_client_credentials'` will fail even if that auth type exists in the framework.

**Legacy vs spec-based connectors may share similar names.** For example, `.jira` is a legacy connector with a different schema than `.jira-cloud` (spec-based). Use the spec-based ID.

## Adding a New Manifest

1. Find the spec in `kbn-connector-specs/src/specs/` and note its `metadata.id`
2. Check what auth types it declares in `auth.types[]`
3. Check what config fields its `schema` requires
4. Create `src/manifests/<name>.yaml` following the format above
5. If vault entries don't exist yet, set `enabled: false` and file a vault request
6. Test with `--dry-run`, then without

## Vault

All secrets are fetched via the `vault` CLI at runtime. The default vault address is `https://secrets.elastic.co:8200` (override with `VAULT_ADDR` env var).

