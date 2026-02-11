---
name: kibana-api
description: Shared utilities for interacting with a local Kibana instance. Provides auto-detection of Kibana URL and auth, and a kibana_curl wrapper. Not invoked directly — sourced by other skills' scripts.
user-invocable: false
---

# Kibana API Utilities

This skill provides shared shell utilities for other skills that need to call Kibana APIs.

## Usage

Source `common.sh` from any skill script. The number of `..` segments depends on how deep the skill is nested:

```bash
# From .claude/skills/<name>/scripts/ (4 levels up):
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd ../../../.. && pwd)"

# From x-pack/platform/plugins/shared/<plugin>/.claude/skills/<name>/scripts/ (9 levels up):
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd ../../../../../../../../.. && pwd)"

source "$REPO_ROOT/.claude/skills/kibana-api/scripts/common.sh"
```

After sourcing, the following are available:

- **`KIBANA_URL`** — Detected base URL (e.g., `http://localhost:5601`)
- **`KIBANA_AUTH`** — Detected credentials (e.g., `elastic:changeme`)
- **`kibana_curl [curl args...]`** — curl wrapper with auth, `kbn-xsrf`, `x-elastic-internal-origin`, and TLS flags pre-configured

## Auto-Detection

Tries these permutations automatically:
- URLs: `http://localhost:5601`, `https://localhost:5601`
- Auth: `elastic:changeme`, `elastic_serverless:changeme`

Override with environment variables `KIBANA_URL` and/or `KIBANA_AUTH` before sourcing.
