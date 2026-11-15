# @kbn/connector-cli

CLI tools for a running Kibana: bulk-create testing connector instances (`create_connectors`), and run read-only canary checks against real vendor APIs through them (`run_canaries`, see [Canary Testing](#canary-testing-proof-of-concept)).

## Quick Start

```bash
# Prerequisites
vault login --method oidc                    # One-time Vault authentication
pnpm es snapshot                             # Start Elasticsearch (separate terminal)
pnpm start                                   # Start Kibana (separate terminal)

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

## Canary Testing (proof of concept)

Canaries run known-good, read-only actions against the real vendor APIs through a running Kibana, to catch vendor API drift. Design doc: [Automated connector canary testing](https://docs.google.com/document/d/1bSYFR5ZelgV-GVqf__xlamqzQdPU4jgWBcKQ77_KxTI/edit). Tracking issue: [elastic/kibana#301679](https://github.com/elastic/kibana/issues/301679).

```bash
node scripts/run_canaries.js --dry-run       # validate fixtures against the specs, execute nothing
node scripts/run_canaries.js                 # run everything
node scripts/run_canaries.js --only .github  # one spec (repeatable, leading dot optional)
```

A real run needs the same prerequisites as `create_connectors` (`vault login`, ES and Kibana running); `--dry-run` needs none of them. The runner exits non-zero if any case is not `ok`, or if no case ran at all.

### Fixtures

A fixture file in `src/canary/` (it must end in `.yaml`; a `.yml` file is rejected) pairs with the manifest that has the same `spec_id`. The fixture's existence opts that connector in. The runner creates the `(testing)` connector from the manifest if it doesn't exist yet. If it does, the runner reuses it and re-syncs its config and secrets from the manifest and Vault first, so a rotated credential is picked up (this needs Vault access on every run). Fixture files run concurrently, and each one's output is printed as a block when it finishes (the returned results stay in fixture order). A spec id can have only one fixture file, so concurrent files never race to create the same connector.

```yaml
spec_id: .jira-cloud
cases:
  - action: getProjects
    # Optional: name to tell cases apart, and enabled: false to skip one without deleting it
    input:
      maxResults: 1
    expect: # paths into the response `data`; array indices are numeric segments
      - path: values
        type: array
      - path: values.0.key
        type: string
```

Types are `string`, `number`, `boolean`, `object`, `array` and `null`. The path `$` is the response itself. Paths split on `.`, so a response key that itself contains a dot can't be addressed, and only a response's own properties are matched. Empty segments (`items.`, `a..b`) are rejected, and array segments must be plain non-negative integers. If the action declares an `output` schema, the response is also parsed with it. The `.github` and `.jira-cloud` actions don't declare one, so for them the `expect` list is the only assertion.

The reserved `_test` action (a spec's connection check, when it enables one) is also allowed. It is the way to prove credentials are valid when no read action fails on bad credentials, as with Jira's `getProjects`, which succeeds anonymously.

Only actions declared `scope: 'read'` are allowed. The scope is advisory and set by the spec author, but the runner refuses anything else.

### Outcomes

| Outcome | Meaning |
| --- | --- |
| `ok` | Executed and the response matched |
| `auth` | HTTP 401/403 from the vendor, a connector authorization error, or (when there is no status) auth wording in the message, see below |
| `test` | Executed, but the response no longer matches the fixture (the drift signal) |
| `error` | Other 4xx or any 5xx from the vendor: drift or an outage |
| `misc` | No HTTP status, timeout, network failure or dropped connection, 408/429, Kibana itself failing the request (other than a 400), the connector couldn't be set up (for example Vault), or an unexpected runner error |
| `fixture` | The fixture doesn't fit the current spec (no spec or enabled manifest for its `spec_id`, unknown action, wrong scope, input fails the action's schema), or Kibana answered the execute call with HTTP 400. Not vendor drift |

The vendor status comes from `error_meta.statusCode` in the execute response. MCP-backed connectors such as `.github` may not set it. For errors with no status, the message is matched against common auth wording (`HTTP`/`HTTPS`/`status` followed by 401 or 403, unauthorized, forbidden, bad credentials, invalid key or token, authentication failed) to still report `auth`; anything else is `misc`. Checked live against `.github` with a bad token ("unauthorized: token authentication failed").

Timeouts: each execute call is cut off after 60 seconds, and the Kibana calls that set up a connector (list, create, update) after 30 seconds. Either is reported as `misc`.

## Vault

All secrets are fetched via the `vault` CLI at runtime. The default vault address is `https://secrets.elastic.co:8200` (override with `VAULT_ADDR` env var).

