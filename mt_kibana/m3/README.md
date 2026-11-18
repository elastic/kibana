# Multi-tenant Kibana M3: behind the Cloud Proxy in a dev MKI cluster

Path under test: client hostname → Cloud Proxy → one multi-tenant Kibana Deployment → that project's Elasticsearch.

- **Proxy and Kibana** run in an ECP DevShard (`devctl`), which has the real serverless `ingress-proxy`. DevEnv claims were removed on 2026-11-04.
- **Tenants** are three real serverless Elasticsearch projects (`mt-project-a`, `-b`, `-c`) created through the DevShard's project API. Each project's public `kb` hostname routes to the one multi-tenant Kibana. `mt-project-a` is the home project (`elasticsearch.hosts`), and is also a tenant.
- The earlier setup, with three ECK clusters as tenants and made-up project ids, is still under [Run it with ECK clusters](#run-it-with-eck-clusters).

Run every command from the repo root. Prerequisites are checked by `mt_kibana/m3/preflight.sh` (VPN, `tsh login`, kube context on the shard).

## How the proxy routes to a multi-tenant service

Read from `elastic/proxy` (`provider/kubernetes/controllers/routeserver/`, `http/request_proxy.go`) and checked with `route_test.yaml`:

- **Multi-tenant Service.** A Service labeled `k8s.elastic.co/is-multi-tenant-service: "true"` and `k8s.elastic.co/application-id: <app>` becomes a route named `<namespace>/<service>`. The proxy reads the EndpointSlice, which copies the Service's labels. The port should be named `https`, because the proxy always uses TLS to backends and verifies the certificate. A cert from the `ecp-issuer` ClusterIssuer works.
- **Per-project Ingress.** Each project needs an Ingress with these annotations: `k8s.elastic.co/project-id`, `project-alias`, `application-id`, `appstatus: Running`, and `target-refs: <namespace>/<service>`. regional-network-controller normally creates it from an AppNetwork, but the proxy only reads the annotations, so `deploy.sh` writes them directly. The route is `<project-id>.<app>.<domain>`, with an alias `<alias>.<app>.<domain>`.
- **Headers.** On every request the proxy **sets** `X-Elastic-Project-Id` to the route's project id and `X-Elastic-Organization-Id` to its org, overwriting anything the client sent. This is the header M1 routes on, so spoofing it from outside has no effect.
- **Host.** The proxy routes on the `Host` header, not SNI, then rewrites `Host` to `<pod-ip>:<port>`. The original hostname is only in `X-Forwarded-Host`.
- **Real projects.** A project's route sends traffic to its `target-refs` Service **and** to every EndpointSlice labeled with its project id and application id (`build.go`), so a project's own Kibana pods share its route with the multi-tenant Kibana. The shard's multi-tenant ingest service is routed the same way: `target_refs` on the project's AppNetwork (`apm`, `ingest`).
- **Unknown projects.** A hostname with no route gets `404 {"ok":false,"message":"Unknown resource."}` from the proxy and never reaches Kibana. So Kibana's 400 guard for unknown projects only catches config drift between the Ingresses and `tenants.yml`.

## First-time setup

Assumes devctl 1.0.0 or later, and that you're logged in to `docker.elastic.co` (`docker login docker.elastic.co`). To upgrade devctl, trust its formula first:

```bash
brew trust --formula elastic/elastic-eng-internal/devctl
```

```bash
export HOMEBREW_GITHUB_API_TOKEN="$(gh auth token)" && brew upgrade devctl
```

1. Connect the Aviatrix VPN (US region profile), then log in to Teleport:

   ```bash
   tsh login --proxy=teleport-proxy.staging.getin.cloud --auth=okta
   ```

2. Check every prerequisite (tools, logins, VPN). Fix anything it flags:

   ```bash
   mt_kibana/m3/preflight.sh
   ```

3. Claim a pooled DevShard. Pooled shards include serverless services. With a shard in the pool, this takes a minute or two:

   ```bash
   devctl create --ttl 8h --follow
   ```

4. Point kubectl at it. `devctl list` shows the name, and `update-kubeconfig` prints the context to use:

   ```bash
   devctl update-kubeconfig <name>
   ```

   ```bash
   kubectl config use-context <context>
   ```

5. Save the shard's test-user Cloud API key as `api_key.devenv` in `~/.elastic/cloud.json`, for `projects.sh`. The shard creates it in secret `iam-global/iam-service-test-user-apikey`. This doesn't print the key:

   ```bash
   key=$(kubectl -n iam-global get secret iam-service-test-user-apikey -o json | jq -r '.data | to_entries[0].value | @base64d') && jq --arg k "$key" '.api_key.devenv = $k' ~/.elastic/cloud.json > ~/.elastic/cloud.json.tmp && mv ~/.elastic/cloud.json.tmp ~/.elastic/cloud.json && chmod 600 ~/.elastic/cloud.json
   ```

The shard hibernates after the `--ttl` idle time. Before a demo, run `devctl wake <name> --ttl 8h`. Shards have lost their S3 buckets about two days after creation, so claim a fresh one close to the demo.

## Run it with real projects

1. Pick the image. PR images go to `kibana-ci/kibana-serverless-pr`, tagged `pr-302955-<first 12 chars of the commit>`:

   ```bash
   export KIBANA_IMAGE=docker.elastic.co/kibana-ci/kibana-serverless-pr:pr-302955-4a624ed8b3ef
   ```

2. Create projects A, B and C. Each project's own Kibana runs `KIBANA_IMAGE`, so the platform initialises the project with the same code: its `kb-migrator` Job creates the `.kibana*` indices. They take about 5 minutes to reach `phase=initialized`:

   ```bash
   mt_kibana/m3/projects.sh create
   ```

   ```bash
   mt_kibana/m3/projects.sh status
   ```

3. Deploy the multi-tenant Kibana and take over each project's `kb` route:

   ```bash
   mt_kibana/m3/deploy_projects.sh
   ```

   - The config is home's own project Kibana config (`kb-kb-config`), with TLS to Elasticsearch verified against the shard's proxy certificate instead of `verificationMode: none`. `server.publicBaseUrl` and the SAML provider are removed, so users log in with `cloud-basic`.
   - Each tenant in `tenants.yml` gets its project's `elastic/kibana` token and both encryption keys, read from the cluster without being printed.
   - Each project's `kb` AppNetwork gets `target_refs: mt-kibana/kibana`. kibana-controller clears it again, but regional-network-controller has already copied it to the Ingress, which the proxy reads.
   - Each project's own UI Kibana (`kb-ui-kb`) is scaled to 0, so the proxy only routes to the multi-tenant Kibana. kibana-controller keeps that replica count. The old pods take about 6 minutes to leave the route.
   - `deploy_projects.sh unroute` gives each route back to the project's own Kibana.

4. Check the path end to end. `smoke_projects.sh` checks that there's one Kibana pod and that every project's hostname is served by it, that each project's Elasticsearch is its own cluster, and that the internal user and the logged-in user each reach their own project's cluster. It also checks that a spoofed header is ignored, that project A's login is rejected on project B, and that the proxy rejects an unknown project:

   ```bash
   mt_kibana/m3/smoke_projects.sh
   ```

5. Watch which cluster each request reaches. Every ES call is logged with its client: `tenant-<project id>`, or `data` for the home cluster. Copy the log locally, then use the M1 tools:

   ```bash
   kubectl -n mt-kibana logs -f deploy/kibana | grep --line-buffered -F '"elasticsearch.query.' > .es/mt/m3/es-queries.ndjson
   ```

   ```bash
   MT_ES_QUERY_LOG=.es/mt/m3/es-queries.ndjson mt_kibana/es_calls.sh watch fe26b0a602eb407090ce2a276305058b
   ```

   `es_calls.sh check` takes `MT_HOME_TENANT=<project A's id>`.

6. In a browser, open each project's `kb` URL (`projects.sh` writes them to `.es/mt/m3/projects-devenv.json`) and log in as `admin` with that project's password. No header extension is needed: each project has its own hostname, and the proxy sets the project header. Reading `.kibana*` directly as `admin` returns nothing, because serverless hides system indices, so the query log is the evidence of where a write went.

   [BROWSER_SETUP.md](BROWSER_SETUP.md) walks through all of this from a fresh checkout, including the demo: a dashboard created in project B that projects A and C can't see.

## Run it with ECK clusters

1. Build the image: draft PR [#302955](https://github.com/elastic/kibana/pull/302955) has `ci:build-serverless-image`. Comment `/ci` to rebuild after pushing. PR images go to `kibana-ci/kibana-serverless-pr` (not `kibana-serverless`), tagged `pr-302955-<first 12 chars of the commit>`. It's the regular Kibana build; `deploy.sh` runs it without `serverless: es`, so it's a stateful Kibana.

   ```bash
   export KIBANA_IMAGE=docker.elastic.co/kibana-ci/kibana-serverless-pr:pr-302955-26d59c7012d5
   ```

2. Create the clusters. `eck.sh` waits for green, creates an `elastic/kibana` service-account token in each, and writes ids, tokens, `cluster_uuid`s and CAs to `.es/mt/m3/`. They use emptyDir storage, so a restarted ES pod loses its cluster: rerun `eck.sh delete` and `create`.

   ```bash
   mt_kibana/m3/eck.sh create
   ```

3. Deploy. This writes the `mt-kibana-config` Secret (`kibana.yml`, `tenants.yml` keyed by project id, and every cluster's CA), runs a one-off single-tenant Kibana Job (`init_job.yaml`) against each tenant other than home, then deploys Kibana and one Ingress per project. The init is the in-cluster version of M1's `init_tenant.sh`: the multi-tenant Kibana only creates `.kibana*` indices and privileges on home.

   ```bash
   mt_kibana/m3/deploy.sh
   ```

4. Check the path end to end:

   ```bash
   mt_kibana/m3/smoke.sh
   ```

   For each project, `/api/stats` (internal user) and the console proxy (current user, the cluster's `elastic` user) must return that project's `cluster_uuid`. It also checks that a spoofed `x-elastic-project-id` is ignored, that one project's credentials get 401 on another project's hostname, and that an unknown project gets 404 from the proxy. The smoke test calls the proxy load balancer with `--resolve` and verifies TLS against `mt.<domain>`, which the proxy's wildcard cert covers, while `Host` carries `<project-id>.mtkb.<domain>`.

   For presenting, `demo.sh` runs the same claims narrated, each checked against Elasticsearch directly (`kubectl exec`) and against Kibana's per-tenant query log. It writes a fresh marker every run. `DEMO_PAUSE=1` waits for Enter between steps. `kubectl apply -f mt_kibana/m3/route_test.yaml` adds an echo backend that shows the headers the proxy forwards.

   ```bash
   DEMO_PAUSE=1 mt_kibana/m3/demo.sh
   ```

5. Clean up:

   ```bash
   kubectl delete ns mt-kibana
   ```

`APP_ID` defaults to `mtkb`, because a devenv's real projects already own `<id>.kb.<domain>`.

## Why not serverless projects (devenv, before DevShards)

On a DevShard, serverless projects work: see [Run it with real projects](#run-it-with-real-projects). In the old devenvs:

- **QA projects** can't be tenants. Serverless Kibana calls internal APIs like `_nodes`, which serverless ES only allows with operator privileges. Only the `elastic/kibana` service-account token has them, and a project's `admin` user can't create it.
- **Devenv projects** would have that token (project-controller writes it into secret `kb-kb-config`), but in our devenvs they never got Elasticsearch:
  - A pooled devenv had no control-plane CosmosDB account, so project-api returned 500. Use `devctl create --direct --cosmos-rbac` instead.
  - In the direct devenv, project-controller needed the `OtelDeliveryConfig` CRD. Its Argo app (`otel-delivery-gateway`) can't sync because nothing installs the `ElasticPodAutoscaler` CRD. Applying just `crds/k8s.elastic.co_oteldeliveryconfigs.yaml` from that chart unblocks it.
  - After that, project-controller waited for endpoints, but global-escluster-controller never created an `ElasticsearchCluster`. Unresolved.
- Real project Kibanas reach ES at `<id>.es.<region>.internal.dev.elastic.cloud` with `ssl.verificationMode: none`. The ECK setup keeps TLS verified against each cluster's CA.
- Serverless Kibana (`serverless: es`) also requires `xpack.security.uiam.enabled`, with a UIAM URL and shared secret.

## Gaps found

- **DNS:** there's no public DNS for made-up project ids, and the wildcard cert doesn't cover `*.<app>.<domain>` for a new app id. With ECK clusters, deploy with `APP_ID=kb` and add the three names to `/etc/hosts`, pointing at the proxy load balancer. Real projects use their own `kb` hostnames, which have both.
- **Route ownership:** kibana-controller owns each project's `kb` AppNetwork and clears `target_refs`. The route to the multi-tenant Kibana only survives because the Ingress keeps the annotation. A real rollout needs kibana-controller to set `target_refs` itself, and to stop running a per-project Kibana.
- **Per-project Kibana alongside:** the proxy sends a project's traffic to its own Kibana pods as well as to the `target-refs` Service, so every project's own UI Kibana is scaled to 0. Its background-tasks Kibana still runs against the project.
- **Per-project Kibana config:** `server.publicBaseUrl`, `xpack.cloud.serverless.project_id`, and the other per-project values in kibana-controller's config have one value per process. The project name is the exception: both scripts set a `projectName` per tenant, and Kibana shows it in the project picker for that project. `deploy.sh` names the ECK tenants (`mt-home`, `mt-a`, `mt-b`); `deploy_projects.sh` copies each real project's own `xpack.cloud.serverless.project_name`.
- **Tenant init:** each tenant needs a single-tenant Kibana boot before the multi-tenant Kibana can serve it. With real projects, the project's own `kb-migrator` Job does this.
- **UIAM and other client certificates:** the multi-tenant Kibana uses home's client certificates (UIAM, autoops, actions) for every project.
- **CAs:** tenant clients inherit `elasticsearch.ssl` from the base config, so every tenant's CA goes in one list, and any tenant's CA is trusted for every tenant.
- **Image version:** the multi-tenant Kibana and every tenant must agree on saved object model versions.
