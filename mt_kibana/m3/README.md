# Multi-tenant Kibana M3: behind the Cloud Proxy in a dev MKI cluster

Path under test: client hostname → Cloud Proxy → one multi-tenant Kibana Deployment → that project's Elasticsearch.

- **Proxy and Kibana** run in an ECP devenv (`devctl`), which has the real serverless `ingress-proxy`.
- **Tenants** are three small stateful Elasticsearch clusters (`mt-es-home`, `-a`, `-b`) run by the devenv's ECK operator, each with a made-up 32-hex project id. This is the same setup as M1 (stateful ES, stateful Kibana), now behind the real proxy. See "Why not serverless projects" below.
- **`mt-home`** is the home cluster (`elasticsearch.hosts`). It's also a tenant, so its hostname routes too.

Run every command from the repo root. Prerequisites are checked by `mt_kibana/m3/preflight.sh` (VPN, `tsh login`, kube context on the devenv).

## How the proxy routes to a multi-tenant service

Read from `elastic/proxy` (`provider/kubernetes/controllers/routeserver/`, `http/request_proxy.go`) and checked with `route_test.yaml`:

- **Multi-tenant Service.** A Service labeled `k8s.elastic.co/is-multi-tenant-service: "true"` and `k8s.elastic.co/application-id: <app>` becomes a route named `<namespace>/<service>`. The proxy reads the EndpointSlice, which copies the Service's labels. The port should be named `https`, because the proxy always uses TLS to backends and verifies the certificate. A cert from the `ecp-issuer` ClusterIssuer works.
- **Per-project Ingress.** Each project needs an Ingress with these annotations: `k8s.elastic.co/project-id`, `project-alias`, `application-id`, `appstatus: Running`, and `target-refs: <namespace>/<service>`. regional-network-controller normally creates it from an AppNetwork, but the proxy only reads the annotations, so `deploy.sh` writes them directly. The route is `<project-id>.<app>.<domain>`, with an alias `<alias>.<app>.<domain>`.
- **Headers.** On every request the proxy **sets** `X-Elastic-Project-Id` to the route's project id and `X-Elastic-Organization-Id` to its org, overwriting anything the client sent. This is the header M1 routes on, so spoofing it from outside has no effect.
- **Host.** The proxy routes on the `Host` header, not SNI, then rewrites `Host` to `<pod-ip>:<port>`. The original hostname is only in `X-Forwarded-Host`.
- **Unknown projects.** A hostname with no route gets `404 {"ok":false,"message":"Unknown resource."}` from the proxy and never reaches Kibana. So Kibana's 400 guard for unknown projects only catches config drift between the Ingresses and `tenants.yml`.

## First-time setup

Assumes `devctl` is installed and you're logged in to `docker.elastic.co` (`docker login docker.elastic.co`).

1. Connect the Aviatrix VPN, then log in to Teleport:

   ```bash
   tsh login --proxy=teleport-proxy.staging.getin.cloud --auth=okta
   ```

2. Check every prerequisite (tools, logins, VPN). Fix anything it flags:

   ```bash
   mt_kibana/m3/preflight.sh
   ```

3. Create a direct devenv. Pooled ones can come with a broken control-plane database. This takes about 1.5 hours:

   ```bash
   devctl create --direct --cosmos-rbac --follow
   ```

4. Point kubectl at it. `devctl list` shows the name, and `update-kubeconfig` prints the context to use:

   ```bash
   devctl update-kubeconfig <name>
   ```

   ```bash
   kubectl config use-context <context>
   ```

The devenv auto-hibernates. Before a demo, run `devctl wake <name>`.

## Run it

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

## Why not serverless projects

- **QA projects** can't be tenants. Serverless Kibana calls internal APIs like `_nodes`, which serverless ES only allows with operator privileges. Only the `elastic/kibana` service-account token has them, and a project's `admin` user can't create it.
- **Devenv projects** would have that token (project-controller writes it into secret `kb-kb-config`), but in our devenvs they never got Elasticsearch:
  - A pooled devenv had no control-plane CosmosDB account, so project-api returned 500. Use `devctl create --direct --cosmos-rbac` instead.
  - In the direct devenv, project-controller needed the `OtelDeliveryConfig` CRD. Its Argo app (`otel-delivery-gateway`) can't sync because nothing installs the `ElasticPodAutoscaler` CRD. Applying just `crds/k8s.elastic.co_oteldeliveryconfigs.yaml` from that chart unblocks it.
  - After that, project-controller waited for endpoints, but global-escluster-controller never created an `ElasticsearchCluster`. Unresolved.
- Real project Kibanas reach ES at `<id>.es.<region>.internal.dev.elastic.cloud` with `ssl.verificationMode: none`. The ECK setup keeps TLS verified against each cluster's CA.
- Serverless Kibana (`serverless: es`) also requires `xpack.security.uiam.enabled`, with a UIAM URL and shared secret.

## Gaps found

- **DNS:** there's no public DNS for these hostnames, and the wildcard cert doesn't cover `*.<app>.<domain>`. [BROWSER_SETUP.md](BROWSER_SETUP.md) reaches them by deploying with `APP_ID=kb` and adding the three names to `/etc/hosts`. Chrome warns about the certificate.
- **Per-project Kibana config:** `server.publicBaseUrl`, `xpack.cloud.serverless.project_id`, and the other per-project values in kibana-controller's config have one value per process. The project name is the exception: `deploy.sh` sets a `projectName` per tenant (`mt-home`, `mt-a`, `mt-b`), and Kibana shows it in the project picker for that project.
- **Tenant init:** each tenant needs a single-tenant Kibana boot before the multi-tenant Kibana can serve it.
- **CAs:** tenant clients inherit `elasticsearch.ssl` from the base config, so every tenant's CA goes in one list, and any tenant's CA is trusted for every tenant.
- **Image version:** the multi-tenant Kibana and every tenant must agree on saved object model versions.
