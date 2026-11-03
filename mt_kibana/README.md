# Multi-tenant Kibana M1 spike

One Kibana dev server routes API requests to three local Elasticsearch clusters: `project-a`, `project-b`, and `project-c`. The `x-elastic-project-id` header picks the cluster, and [`tenants.yml`](tenants.yml) holds each project's credentials and saved objects encryption key. With no header, requests go to the home cluster (`elasticsearch.hosts`, which is `project-a`).

The core change lives in `src/core/packages/elasticsearch/server-internal/src/`. `elasticsearch_service.ts` wires it in, and `multi_tenancy/` holds the logic: `tenants_file.ts` reads `tenants.yml`, and `tenant_clients.ts` manages the project clients and the unknown-project guard. It stays off unless `elasticsearch.multiTenancy.tenantsFile` is set. Beyond M1, `request.projectId`, request-aware internal saved objects repositories, and per-project encrypted saved objects build on it.

Run every command from the repo root. Remove this folder (`git rm -r mt_kibana`) before opening a PR.

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

The passwords differ on purpose, so a misrouted request fails with a 401. Installs and data live in `.es/mt/`, which git ignores. Every start wipes that cluster's data, so rerun its init (step 2) after a restart.

## 2. Initialise each cluster

With all three clusters running, and nothing else on port 5601:

```bash
mt_kibana/init_tenant.sh a && mt_kibana/init_tenant.sh b && mt_kibana/init_tenant.sh c
```

Each run boots single-tenant Kibana against one cluster until "Kibana is now available", then stops it (about 30 seconds). This creates the `.kibana*` indices and registers Kibana's privileges. It also passes the project's encryption key from `tenants.yml` (`a`, `b`, or `c` repeated 32 times), so anything encrypted during init uses it. Logs go to `.es/mt/init-<a|b|c>.log`.

## 3. Run multi-tenant Kibana

```bash
node scripts/kibana --dev --no-base-path --no-optimizer --elasticsearch.password=changeme-a \
  --elasticsearch.multiTenancy.tenantsFile=$PWD/mt_kibana/tenants.yml
```

Drop the last flag to get the single-tenant "red" baseline: `smoke.sh` then passes only for `project-a`, and `b` and `c` get a 401.

## 4. Check it

`mt_kibana/smoke.sh` prints `PASS` for each project whose `/api/stats` `cluster_uuid` (internal-user path) and console proxy `cluster_name` (current-user path) come from that project's cluster. The console proxy is an internal API, so its calls send `x-elastic-internal-origin: kibana` like the browser does.

`mt_kibana/so_check.sh` writes a data view, an advanced setting, and a space through `project-b`, then checks where each one is stored and who can see it. The setting check through `project-a` fails because advanced settings are cached per space for the whole process, not per project (see [`FINDINGS.md`](FINDINGS.md)).

`mt_kibana/eso_check.sh` creates `.index` and webhook connectors through `project-b` and `project-c` and runs them, including in parallel. It checks that each run reads its own project's connector, decrypts its secrets, and writes only to its own cluster. It also prints where the connector's event log entries landed.

Isolation check for the per-project keys: create a webhook connector with a secret through `project-b`. Then start single-tenant Kibana against cluster B with the default key: `node scripts/kibana --dev --no-base-path --no-optimizer --elasticsearch.hosts=http://localhost:9201 --elasticsearch.password=changeme-b`. Running the connector fails with `Failed to decrypt attribute "secrets"`.
Misrouting checks:

```bash
# 401: cluster B rejects cluster A's password, so authentication really went to B
curl -s -o /dev/null -w '%{http_code}\n' -u elastic:changeme-a -H 'x-elastic-project-id: project-b' localhost:5601/api/stats
# 400: unknown project
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

## Owners

| Task | Owner |
| --- | --- |
| ES clusters and red baseline (day 1) | |
| Core change and unit tests (day 2) | |
| End-to-end validation (day 3) | |
| Stretch goals (day 4) | |
| Demo and [`FINDINGS.md`](FINDINGS.md) (day 5) | |
