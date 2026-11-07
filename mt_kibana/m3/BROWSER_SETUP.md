# M3 from scratch: one Kibana for three real projects on a DevShard, logged in from a browser

Run every command from the Kibana repo root.

This deploys the `multi-tenant-kibana-hackathon` branch to an ECP DevShard. Three real serverless Elasticsearch projects (A, B and C) are the tenants. Each project's own `kb` hostname is routed by the shard's Cloud Proxy to one multi-tenant Kibana, and that Kibana sends each request to its project's Elasticsearch. Project A is also the home cluster.

**What changed.** This guide used to create a devenv and three ECK clusters. DevEnv claims were removed on 2026-11-04, so it now uses a DevShard. A DevShard can create real serverless projects, so the made-up project ids, `/etc/hosts` entries, and init Job are gone. The ECK setup still works on a DevShard. See [Run it with ECK clusters](README.md#run-it-with-eck-clusters).

Claiming a shard takes a few minutes. Creating the projects takes about 5 minutes, and the deploy about 10 more. Building a new image can take up to 90 minutes.

## 1. Get the branch and the tools

```bash
git clone https://github.com/elastic/kibana.git
cd kibana
git checkout multi-tenant-kibana-hackathon
nvm install
nvm use
node scripts/kbn bootstrap
```

`nvm use` must print the version in `.nvmrc` (currently v24.22.1). Kibana exits immediately on any other Node version.

Install `kubectl`, `devctl`, `tsh`, `yq`, `jq`, `gh`, `docker`, and `curl` if `preflight.sh` reports them missing. Start Docker Desktop. Log in to GitHub and Docker:

```bash
gh auth login
docker login docker.elastic.co
```

`devctl` must be 1.0.0 or later (`devctl version`). The Homebrew tap is private, so trust the formula and pass a GitHub token to upgrade it:

```bash
brew trust --formula elastic/elastic-eng-internal/devctl
```

```bash
export HOMEBREW_GITHUB_API_TOKEN="$(gh auth token)" && brew upgrade devctl
```

`brew install bk` installs a book reader, not the Buildkite CLI. `bk --help` saying "read a book" means it is the wrong program. To get the Buildkite CLI:

```bash
brew trust --formula buildkite/buildkite/bk@3
brew install buildkite/buildkite/bk
```

## 2. Pick or build the image

The shard runs a container image, not this checkout. The tag is `pr-302955-` plus the first 12 characters of the commit that was built.

To use an image that already exists, take the commit from the latest green **Build Project Image** step on PR [#302955](https://github.com/elastic/kibana/pull/302955). To build one for your commit, push it to the branch and comment `/ci` on the PR. The PR has the `ci:build-serverless-image` label. Wait for the **Build Project Image** step to go green. A green overall build is not enough, because that step is allowed to fail softly.

```bash
export KIBANA_IMAGE=docker.elastic.co/kibana-ci/kibana-serverless-pr:pr-302955-<12 chars>
docker pull "$KIBANA_IMAGE"
```

`docker pull` either downloads the image or says the tag was not found. Keep this `export` in the terminal you deploy from. `projects.sh` and `deploy_projects.sh` exit immediately if `KIBANA_IMAGE` is unset, and a new terminal does not keep the variable.

`tenants.yml` accepts `projectName` only in images built from `47005f16889e` or later. Every project's own Kibana and the multi-tenant Kibana run this one image, so they agree on saved object versions.

## 3. Claim a DevShard

Connect the Aviatrix VPN (US region profile), then log in to Teleport:

```bash
tsh login --proxy=teleport-proxy.staging.getin.cloud --auth=okta
```

Claim a pooled shard. Pooled shards come with the serverless services, so this takes a minute or two when the pool has one ready. `--follow` returns when the shard is Ready:

```bash
devctl create --ttl 8h --follow
```

The `Name:` line has the shard name, for example `briando-devshard-dcbddd`. Point kubectl at it. `update-kubeconfig` prints the context name:

```bash
devctl update-kubeconfig <name>
```

```bash
kubectl config use-context <context>
```

Save the shard's test-user Cloud API key as `api_key.devenv` in `~/.elastic/cloud.json`. `projects.sh` uses it to call the shard's project API. This does not print the key:

```bash
key=$(kubectl -n iam-global get secret iam-service-test-user-apikey -o json | jq -r '.data | to_entries[0].value | @base64d') && jq --arg k "$key" '.api_key.devenv = $k' ~/.elastic/cloud.json > ~/.elastic/cloud.json.tmp && mv ~/.elastic/cloud.json.tmp ~/.elastic/cloud.json && chmod 600 ~/.elastic/cloud.json
```

If `~/.elastic/cloud.json` doesn't exist yet, create it first with `mkdir -p ~/.elastic && echo '{}' > ~/.elastic/cloud.json`.

Check everything:

```bash
mt_kibana/m3/preflight.sh
```

Kube create permissions and the AppNetwork CRD must say OK. `kubectl config current-context` must be the shard, not a production cluster.

The shard hibernates after the `--ttl` idle time. Before a demo, run `devctl wake <name> --ttl 8h` and reconnect the VPN. Shards have lost their S3 buckets about two days after creation, so claim a fresh one close to the demo.

**On public or hotel Wi-Fi**, `kubectl` and `devctl` can time out even with the VPN connected. Those networks often use `10.0.0.0/8`, which hides Teleport's `10.255.x` addresses. Find the VPN interface with `ifconfig | grep -B3 'inet 10.255'` (for example `utun4`), then add a route through it:

```bash
sudo route -n add -net 10.255.0.0/16 -interface utun4
```

## 4. Create the three projects

```bash
mt_kibana/m3/projects.sh create
```

This creates `mt-project-a`, `mt-project-b`, and `mt-project-c` through the shard's project API. Each project's own Kibana runs `KIBANA_IMAGE`, and its `kb-migrator` Job creates the `.kibana*` indices with that image. The ids, hostnames, and each project's `admin` password go to `.es/mt/m3/projects-devenv.json`. That file is gitignored and contains secrets.

Wait until all three say `phase=initialized`, about 5 minutes:

```bash
mt_kibana/m3/projects.sh status
```

## 5. Deploy the multi-tenant Kibana

`KIBANA_IMAGE` must already be exported in this terminal.

```bash
mt_kibana/m3/deploy_projects.sh
```

This:

- builds `kibana.yml` from project A's own Kibana config, with TLS to Elasticsearch verified against the shard's certificate. It removes `server.publicBaseUrl` and the SAML provider, so you log in with a username and password.
- builds `tenants.yml`, keyed by project id, with each project's `elastic/kibana` token and encryption keys. Secrets go from the cluster into the `mt-kibana` Secret without being printed.
- starts one Kibana pod in namespace `mt-kibana`.
- points each project's `kb` route at it, and scales each project's own UI Kibana (`kb-ui-kb`) to 0.

The old project Kibana pods take about 6 minutes to leave the route. Until then, some requests can still reach them. Then run the smoke test:

```bash
mt_kibana/m3/smoke_projects.sh
```

All 19 lines should say `PASS`. If `has no Kibana of its own in its route` fails, wait a few minutes and rerun it.

## 6. Log in from the browser

Use Chrome or Edge, and stay on the VPN. There is nothing to install: each project has its own hostname, so the browser keeps a separate session for each, and the proxy sets `x-elastic-project-id` itself. A header you set yourself is overwritten.

Print the three URLs:

```bash
jq -r 'to_entries[] | "\(.key)  \(.value.kibana)"' .es/mt/m3/projects-devenv.json
```

The username on every project is `admin`. Copy one project's password to the clipboard without printing it:

```bash
jq -r .b.password .es/mt/m3/projects-devenv.json | pbcopy
```

Open project B's URL. At **Your connection is not private**, click **Advanced**, then **Proceed**: the shard uses a self-signed certificate. Log in as `admin` with B's password. Do the same for A and C in their own tabs, with `.a.password` and `.c.password`.

Wait at least 10 seconds before switching from one project's tab to another, unless your image includes the M5 settings cache fix. Older images cache advanced settings for 10 seconds by space only, so a project can briefly see another project's settings, such as its default data view.

## 7. Run the demo

**Watch which cluster answers.** Before you click around, start two terminals. The first copies Kibana's query log locally:

```bash
kubectl -n mt-kibana logs -f deploy/kibana | grep --line-buffered -F '"elasticsearch.query.' > .es/mt/m3/es-queries.ndjson
```

The second follows one project's requests. Each line shows the client that served the call: `tenant-<project id>`, or `HOME` for project A's cluster.

```bash
MT_ES_QUERY_LOG=.es/mt/m3/es-queries.ndjson mt_kibana/es_calls.sh watch "$(jq -r .b.id .es/mt/m3/projects-devenv.json)"
```

**Add data to project B only.** In the project-B tab, open **Dev Tools** and run:

```
POST mt-b-weblogs/_bulk?refresh=true
{"index":{}}
{"@timestamp":"2026-11-06T10:00:00Z","status":200,"path":"/","bytes":512}
{"index":{}}
{"@timestamp":"2026-11-06T10:01:00Z","status":404,"path":"/missing","bytes":128}
{"index":{}}
{"@timestamp":"2026-11-06T10:02:00Z","status":500,"path":"/api","bytes":64}
```

Use today's date in the timestamps.

**Create a dashboard in project B.**

1. Open **Discover** and create a data view for `mt-b-weblogs` with time field `@timestamp`. Name it **Project B web logs**. Set the time range to **Last 7 days**. You should see the three documents.
2. Open **Dashboards**, then **Create dashboard**. Add a visualization of **Count of records** broken down by `status`. Save the dashboard as **Project B web traffic**.
3. Copy the dashboard's URL from the address bar.

**Show it's not in A or C.**

1. In the project-A tab, paste B's dashboard URL and change only the hostname to project A's. You should get a "not found" error.
2. Open **Dashboards** and **Discover**. Neither **Project B web traffic** nor **Project B web logs** is listed.
3. Do the same in the project-C tab.

**Show it's one Kibana.** This asks each project's hostname which Kibana answered. It should print the same uuid three times:

```bash
for n in a b c; do printf 'user = "admin:%s"\n' "$(jq -r .$n.password .es/mt/m3/projects-devenv.json)" | curl -s -K - --cacert .es/mt/m3/shard.crt "$(jq -r .$n.kibana .es/mt/m3/projects-devenv.json)/api/status" | jq -r .uuid; done
```

```bash
kubectl -n mt-kibana get pods
```

**Show each project has its own Elasticsearch.** This prints three different cluster names, each one the project's id:

```bash
for n in a b c; do printf 'user = "admin:%s"\n' "$(jq -r .$n.password .es/mt/m3/projects-devenv.json)" | curl -s -K - --cacert .es/mt/m3/shard.crt "$(jq -r .$n.es .es/mt/m3/projects-devenv.json)" | jq -c '{cluster_name, cluster_uuid}'; done
```

`.es/mt/m3/shard.crt` is the shard's certificate, which `deploy_projects.sh` saves.

**Check for misroutes.** Stop the first terminal with Ctrl-C, then:

```bash
MT_ES_QUERY_LOG=.es/mt/m3/es-queries.ndjson MT_HOME_TENANT="$(jq -r .a.id .es/mt/m3/projects-devenv.json)" mt_kibana/es_calls.sh check
```

Each `MISROUTED` line is a call made for a B or C request that reached project A's cluster. The known ones are listed in [FINDINGS.md](../FINDINGS.md), under "M3 on a DevShard with real projects".

## 8. Clean up

Give each project's route back to its own Kibana, then delete the multi-tenant Kibana:

```bash
mt_kibana/m3/deploy_projects.sh unroute
```

```bash
kubectl delete ns mt-kibana
```

To delete the projects too, run `mt_kibana/m3/projects.sh delete`. To release the shard, run `devctl destroy <name>`.

## What you will see that is not a routing bug

- **Certificate warning.** The shard's certificate is self-signed. It still covers the project hostnames, and the proxy routes on the hostname.
- **Configuration recommended** toast about `server.publicBaseUrl`. One Kibana process has one public URL, and three hostnames share it.
- **Advanced settings or the default data view from another project** within 10 seconds of switching projects, on images without the M5 fix.
- **Misrouted calls to project A.** Some background reads and usage counters still use the home cluster. FINDINGS.md lists them.
- **A page hangs or comes back blank** on a flaky network. Reload once.
