# Multi-tenant Kibana M1 spike

One Kibana dev server routes API requests to three local Elasticsearch clusters, one per tenant: `project-a`, `project-b`, and `project-c`. The `x-elastic-project-id` header picks the tenant, and [`tenants.yml`](tenants.yml) holds each tenant's credentials, saved objects encryption key, and session encryption key. With no header, requests go to the home cluster (`elasticsearch.hosts`, which is `project-a`).

Run every command from the repo root. Remove this folder (`git rm -r mt_kibana`) before opening a PR.

## Implementation

Kibana stays a single process. Each request is tagged with its tenant when it arrives, and the code that talks to Elasticsearch uses that tag to pick the tenant's cluster.

- **Tenants service** (`src/core/packages/tenants/`): reads `tenants.yml` at startup. It's the only code that creates a `TenantId`, and it stays off unless `tenants.file` is set.
- **HTTP**: checks the `x-elastic-project-id` header against the tenants service, then sets `request.tenantId`. Unknown tenants get a 400.
- **Elasticsearch**: `asScoped(request)` returns a client for the request's tenant, built from that tenant's credentials. Requests without a tenant use the home cluster.
- **Saved objects**: repositories that use Kibana's internal user now take the request, so data views, spaces, and settings are stored in the tenant's cluster. Each repository and client knows its tenant (`getTenantId()`), and advanced settings cache their values per tenant and space. Encrypted saved objects use the tenant's own key: core hands ESO a crypto for it, never the key itself.
- **Security**: authentication and user profiles follow the request, so basic auth, API keys, and session login work for each tenant.
- **Data and data views**: field lists, searches (`es`, `ese`, ES|QL), and KQL value suggestions already used request-scoped clients, so they follow the tenant with no changes. The default data view is an advanced setting, so it follows the tenant through the settings cache fix.
- **Sessions**: each tenant's sessions are stored in its own cluster's session index, encrypted with the tenant's session key, and the session cookie only works for the tenant it was created for. Token-based login providers (SAML, OIDC, PKI, token, Kerberos) get and refresh tokens on the tenant's cluster.

[`FINDINGS.md`](FINDINGS.md) lists what still goes to the home cluster.

## Setup (once)

```bash
nvm use && node scripts/kbn bootstrap
node scripts/es snapshot --download-only
```

You need `jq` and about 6-8 GB of free RAM (three ES clusters at 1 GB heap, plus the Kibana dev server).

## 1. Start the clusters

One terminal each:

```bash
mt_kibana/start_es.sh a   # project-a on :9200, elastic:changeme-a
mt_kibana/start_es.sh b   # project-b on :9201, elastic:changeme-b
mt_kibana/start_es.sh c   # project-c on :9202, elastic:changeme-c
```

The passwords differ on purpose, so a misrouted request fails with a 401. If other clusters already use 9200-9202 or Kibana 5601, set `MT_ES_PORT=9220` (clusters on 9220-9222) and `MT_KBN_PORT=5611` for `start_es.sh`, `init_tenant.sh`, `smoke.sh`, `so_check.sh`, and `data_check.sh`. Then start Kibana with `--server.port=5611 --elasticsearch.hosts=http://localhost:9220` and a copy of `tenants.yml` with the same ports. Installs and data live in `.es/mt/`, which git ignores. Every start wipes that cluster's data, so rerun its init (step 2) after a restart. Extra arguments go to Elasticsearch, for example `mt_kibana/start_es.sh b -E xpack.security.authc.token.enabled=true`.

## 2. Initialise each cluster

With all three clusters running, and nothing else on port 5601:

```bash
mt_kibana/init_tenant.sh a && mt_kibana/init_tenant.sh b && mt_kibana/init_tenant.sh c
```

Each run boots single-tenant Kibana against one cluster until "Kibana is now available", then stops it (about 30 seconds). This creates the `.kibana*` indices and registers Kibana's privileges. It also passes the tenant's encryption key from `tenants.yml` (`a`, `b`, or `c` repeated 32 times), so anything encrypted during init uses it. Logs go to `.es/mt/init-<a|b|c>.log`.

## 3. Run multi-tenant Kibana

```bash
node scripts/kibana --dev --no-base-path --no-optimizer --elasticsearch.password=changeme-a \
  --tenants.file=$PWD/mt_kibana/tenants.yml
```

Drop the last flag to get the single-tenant "red" baseline: `smoke.sh` then passes only for `project-a`, and `b` and `c` get a 401.

## 4. Check it

`mt_kibana/smoke.sh` prints `PASS` for each tenant whose `/api/stats` `cluster_uuid` (internal-user path) and console proxy `cluster_name` (current-user path) come from that tenant's cluster. The console proxy is an internal API, so its calls send `x-elastic-internal-origin: kibana` like the browser does.

`mt_kibana/so_check.sh` writes a data view, an advanced setting, and a space through `project-b`, then checks where each one is stored and who can see it. Advanced settings are cached per tenant and space, so the setting written through `project-b` doesn't show up in `project-a`.

`mt_kibana/data_check.sh` (M5) gives clusters A and B an index with the same name but different documents and one field each. Through `project-b` it checks field lists, a data view's fields, `es`, `ese`, and ES|QL searches, KQL value suggestions, the default data view, and the KQL opt-in counter, and that each only sees or writes cluster B.

`mt_kibana/eso_check.sh` creates `.index` and webhook connectors through `project-b` and `project-c` and runs them, including in parallel. It checks that each run reads its own tenant's connector, decrypts its secrets, and writes only to its own cluster. It also prints where the connector's event log entries landed.

`mt_kibana/session_check.sh` creates the same user on every cluster, so a session replayed against the wrong tenant could authenticate. It logs in through `project-b` and checks that the session is stored only in cluster B, that profile changes land in cluster B, that `project-a` rejects B's cookie, that logout removes the session, and that 30 parallel logins across the tenants each land in their own cluster.

`mt_kibana/session_cleanup_check.sh` checks that the session cleanup task removes an expired session from cluster B. It takes about a minute, and needs Kibana started with `--xpack.security.session.lifespan=30s --xpack.security.session.cleanupInterval=10s`.

Token provider check: start the clusters with `-E xpack.security.authc.token.enabled=true -E xpack.security.authc.token.timeout=1m`, and Kibana with `--xpack.security.authc.providers.basic.basic.order=0 --xpack.security.authc.providers.token.token.order=1`. Log in through `project-b` as in the session login example below, with `"providerType":"token","providerName":"token"`. After a minute the access token has expired, and `/internal/security/me` still returns 200 because Kibana refreshed it on cluster B.

Isolation check for the per-tenant keys: create a webhook connector with a secret through `project-b`. Then start single-tenant Kibana against cluster B with the default key: `node scripts/kibana --dev --no-base-path --no-optimizer --elasticsearch.hosts=http://localhost:9201 --elasticsearch.password=changeme-b`. Running the connector fails with `Failed to decrypt attribute "secrets"`.
Misrouting checks:

```bash
# 401: cluster B rejects cluster A's password, so authentication really went to B
curl -s -o /dev/null -w '%{http_code}\n' -u elastic:changeme-a -H 'x-elastic-project-id: project-b' localhost:5601/api/stats
# 400: unknown tenant
curl -s -o /dev/null -w '%{http_code}\n' -u elastic:changeme-a -H 'x-elastic-project-id: project-z' localhost:5601/api/stats
# project-a: no header goes to the home cluster
curl -s -u elastic:changeme-a -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: kibana' \
  -X POST 'localhost:5601/api/console/proxy?method=GET&path=/' | jq -r .cluster_name
```

API key created on cluster B (expect 200, then 401):

```bash
key=$(curl -s -u elastic:changeme-b -H 'content-type: application/json' -X POST localhost:9201/_security/api_key -d '{"name":"mt-m1"}' | jq -r .encoded)
curl -s -o /dev/null -w '%{http_code}\n' -H "authorization: ApiKey $key" -H 'x-elastic-project-id: project-b' localhost:5601/api/stats
curl -s -o /dev/null -w '%{http_code}\n' -H "authorization: ApiKey $key" -H 'x-elastic-project-id: project-a' localhost:5601/api/stats
```

Session login through `project-b`, as the browser does it (expect 200, then `elastic`). For a real browser, see [step 5](#5-use-it-in-a-browser):

```bash
h=(-H 'x-elastic-project-id: project-b' -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: kibana' -H 'content-type: application/json')
curl -s -c /tmp/mt-cookie -o /dev/null -w '%{http_code}\n' "${h[@]}" -X POST localhost:5601/internal/security/login \
  -d '{"providerType":"basic","providerName":"basic","currentURL":"http://localhost:5601/login","params":{"username":"elastic","password":"changeme-b"}}'
curl -s -b /tmp/mt-cookie "${h[@]}" localhost:5601/internal/security/me | jq -r .username
```

Cross-talk under load. Expect exactly three lines, `100 project-a -> project-a` and so on:

```bash
seq 300 | xargs -P 12 -n 1 sh -c '
  p=$(printf abc | cut -c$(($1 % 3 + 1)))
  got=$(curl -s -u elastic:changeme-$p -H "x-elastic-project-id: project-$p" -H "kbn-xsrf: true" \
    -H "x-elastic-internal-origin: kibana" -X POST "localhost:5601/api/console/proxy?method=GET&path=/" |
    jq -r .cluster_name)
  echo "project-$p -> $got"' _ | sort | uniq -c
```

If something misroutes, add this to `config/kibana.dev.yml`. Each ES call then logs which client served it, for example `elasticsearch.query.tenant-project-b`. Console proxy calls log as `elasticsearch.query.console` instead, so use `/api/stats` to see the tenant.

```yaml
logging.loggers:
  - name: elasticsearch.query
    level: debug
```

## 5. Use it in a browser

Give each tenant its own hostname, so the browser keeps a separate session cookie for each. Chrome sends `*.localhost` to your machine, so no `/etc/hosts` change is needed:

- `http://project-a.localhost:5601`
- `http://project-b.localhost:5601`
- `http://project-c.localhost:5601`

In a header-injecting extension (for example ModHeader), add one rule per hostname that sets `x-elastic-project-id` to that tenant, the way the proxy will. Log in as `elastic` with the tenant's password (`changeme-a` and so on). [MANUAL_UI_TEST.md](MANUAL_UI_TEST.md) is a step-by-step browser walkthrough. On a single hostname, logging into one tenant replaces the other tenant's cookie. Separate browser profiles also work.

To see which cluster each browser action reaches, put this in a file outside the shared config (for example `.es/mt/kibana-m5-logging.yml`, with an absolute `fileName`) and add `-c config/kibana.yml -c <that file>` to the Kibana command:

```yaml
logging.appenders.es-queries:
  type: file
  fileName: /absolute/path/to/.es/mt/es-queries.ndjson
  layout:
    type: json
logging.loggers:
  - name: elasticsearch.query
    level: debug
    appenders: [default, es-queries]
```

`mt_kibana/es_calls.sh watch b` then follows project-b's calls live. Each line shows the client (`tenant-project-b`, or `HOME` for the home cluster) and the first 8 characters of the Kibana request id. A `HOME` line that shares a request id with a `tenant-project-b` line is a call that went to the wrong cluster. Background tasks are hidden. `mt_kibana/es_calls.sh check "<local start time, for example 2026-11-05T09:00>"` lists those calls afterwards. `mt_kibana/discover_proof.sh` lists the Discover sessions, data views, settings, and indices that each cluster holds, read directly from Elasticsearch.

Logout is a browser navigation (`/logout`). Calling `/api/security/logout` with `kbn-xsrf` or other AJAX headers returns a 400 instead of redirecting.

## Owners

| Task | Owner |
| --- | --- |
| ES clusters and red baseline (day 1) | |
| Core change and unit tests (day 2) | |
| End-to-end validation (day 3) | |
| Stretch goals (day 4) | |
| Demo and [`FINDINGS.md`](FINDINGS.md) (day 5) | |
