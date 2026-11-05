# M3 from scratch: one Kibana in a dev MKI cluster, logged in from a browser

Run every command from the Kibana repo root. Creating the devenv is the long step. The clusters and Kibana take about 15 minutes after that, plus the image build.

This deploys the `multi-tenant-kibana-hackathon` branch behind the devenv's Cloud Proxy. The browser uses three project hostnames. The proxy sets `x-elastic-project-id` from the hostname, so no header extension is required. Each hostname keeps its own session.

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

Install `kubectl`, `devctl`, `tsh`, `helm`, `yq`, `jq`, `gh`, `docker`, `vault`, and `curl` if `preflight.sh` reports them missing. Start Docker Desktop.

`brew install bk` installs a book reader, not the Buildkite CLI. `bk --help` saying "read a book" means it is the wrong program. Trust the formula Homebrew names, then install the CLI:

```bash
brew trust --formula buildkite/buildkite/bk@3
brew install buildkite/buildkite/bk
bk version
```

`bk version` should print a version. Log in to GitHub and Docker:

```bash
gh auth login
docker login docker.elastic.co
```

`gh` needs permission to push to `elastic/kibana`.

## 2. Build the image

The devenv runs a container image, not this checkout. PR [#302955](https://github.com/elastic/kibana/pull/302955) needs the `ci:build-serverless-image` label. Comment `/ci` on that PR.

The image is ready when the **Build Project Image** step is green for that commit. A green overall build is not enough: that step is allowed to fail softly. It can take up to 90 minutes.

The tag is `pr-302955-` plus the first 12 characters of the commit that was built:

```bash
git rev-parse --short=12 HEAD
export KIBANA_IMAGE=docker.elastic.co/kibana-ci/kibana-serverless-pr:pr-302955-<those 12 chars>
docker pull "$KIBANA_IMAGE"
```

`docker pull` either downloads the image or says the tag was not found. Keep this `export` in the terminal you will deploy from. `deploy.sh` exits immediately if `KIBANA_IMAGE` is unset, and a new terminal does not keep the variable.

## 3. Reach a devenv

Connect the Aviatrix VPN, then log in to Teleport and select the devenv management cluster. A Teleport login alone does not create the kube context. `devctl create` fails with `context "ecstaging-dev-awseuw1-mki-mgmt-unified-denv" does not exist` until you do:

```bash
tsh login --proxy=teleport-proxy.staging.getin.cloud --auth=okta
tsh kube login dev-awseuw1-mki-mgmt-unified-denv
```

`kubectl config current-context` must not be a production cluster. A production context such as `production-prd-gcpusc1-cp-internal-app-1` can read secrets and still deny every create.

Create a direct devenv. A pooled one can come with a broken control-plane database:

```bash
devctl create --direct --cosmos-rbac --follow
```

`--follow` waits until every ECP service is ready. That can stay at **Partially ready** for more than two hours. The cluster, ArgoCD, Vault, and CosmosDB go Ready, while `otel-delivery-gateway` stays Missing and `hosted-otel-controller` and `motel-index-collector` stay Degraded. Those apps are the known devenv gap, and this demo does not use them. It needs the Cloud Proxy and the ECK operator, which are on the cluster once **K8S Cluster: Ready** is shown.

Stop the follow command at that point. Stopping it does not destroy the devenv. The name is on the `Name:` line, for example `hammadnasi-devenv-3de5eb`.

```bash
devctl update-kubeconfig <name>
kubectl config use-context <context>
mt_kibana/m3/preflight.sh
```

These three failures do not block the deploy:

- **`bk auth`.** `preflight.sh` runs `bk api /pipelines?per_page=1`. Deploy does not.
- **Cloud API key (`qa`).** The check reads `.api_key.qa` inside `~/.elastic/cloud.json` and calls `https://public-api.qa.cld.elstc.co`. A top-level field named `api_key.qa` does not count. A key from the production Cloud Console returns 401. `eck.sh` does not call that API.
- **Vault token.** The check runs only when `VAULT_ADDR` is set. `https://vault-ci-prod.elastic.dev` is the CI prod vault. This deploy does not read Vault. `unset VAULT_ADDR VAULT_TOKEN` turns the line into a skip.

Kube create permissions and the AppNetwork CRD must say OK. The devenv hibernates on its own. After that, `devctl wake <name>` and reconnect the VPN before you continue.

## 4. Create the three clusters

```bash
mt_kibana/m3/eck.sh create
```

This starts `mt-es-home`, `mt-es-a`, and `mt-es-b`, waits until each is green, and writes project ids, the `elastic` password for each cluster, and certificates to `.es/mt/m3/projects-eck.json`. That file is gitignored and contains secrets.

The clusters store data on emptyDir. If an Elasticsearch pod restarts, the data is gone. Run `mt_kibana/m3/eck.sh delete`, then `eck.sh create`, then `deploy.sh` again.

## 5. Deploy Kibana

`APP_ID=kb` makes the proxy hostname `<project-id>.kb.eu-west-1.aws.dev.elastic.cloud`. Those names have no public DNS. The smoke test still passes, because it connects to the proxy load balancer and sends the project name as the `Host` header. The browser steps below add the names to `/etc/hosts`.

`KIBANA_IMAGE` must already be exported in this terminal.

```bash
APP_ID=kb mt_kibana/m3/deploy.sh
```

`deploy.sh` writes `tenants.yml` (one saved-objects key and one session key per project), boots a single-tenant Kibana job against projects a and b, then starts one multi-tenant Kibana pod and one Ingress per project. Wait until it prints that the rollout finished.

```bash
APP_ID=kb mt_kibana/m3/smoke.sh
```

Every line should say `PASS`. Run the smoke test with the same `APP_ID`. The default `mtkb` sends a `Host` the Ingresses do not have.

## 6. Point the three hostnames at the proxy

Stay on the VPN. This prints one `/etc/hosts` line per project, using the load balancer address:

```bash
ip=$(dig +short "$(kubectl -n ingress-proxy get svc ingress-proxy -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')" | head -1)
jq -r --arg ip "$ip" '.[] | "\($ip) \(.id).kb.eu-west-1.aws.dev.elastic.cloud"' .es/mt/m3/projects-eck.json
```

Append those lines once. Appending twice creates duplicates.

```bash
jq -r --arg ip "$ip" '.[] | "\($ip) \(.id).kb.eu-west-1.aws.dev.elastic.cloud"' .es/mt/m3/projects-eck.json | sudo tee -a /etc/hosts
```

`dig` of the hostname with no hosts entry returns nothing. That is expected. After the entries are in place, the name resolves to the load balancer:

```bash
id=$(jq -r .a.id .es/mt/m3/projects-eck.json)
dscacheutil -q host -a name "$id.kb.eu-west-1.aws.dev.elastic.cloud"
```

## 7. Log in from the browser

Print the three URLs and passwords. The username on every project is `elastic`. The project name (`home`, `a`, `b`) is not a user. Typing it shows **Username or password is incorrect**, and the Kibana log says `unable to authenticate user [home]` or `[a]`.

```bash
jq -r --arg domain 'eu-west-1.aws.dev.elastic.cloud' \
  'to_entries[] | "https://\(.value.id).kb.\($domain)/login  \(.value.username)  \(.value.password)"' \
  .es/mt/m3/projects-eck.json
```

Use Chrome or Edge. Leave the VPN connected. Open the three URLs, one tab each. Chrome warns that the certificate is for a different name. Continue past that warning. Log in as `elastic` with the password on that line.

You should land in Kibana in all three tabs. The first login may show **Select a solution view for your space**. Pick **Classic (legacy)**. The other tabs may skip that page. That skip is a known gap.

There is nothing to install in the browser. A header you set yourself is overwritten by the proxy.

**See the routing.** In the project-a tab, type project b's password and click **Log in**. You should get **Username or password is incorrect**. Then log in with project a's password.

**See which cluster answers.** In each tab open **Dev Tools** (`/app/dev_tools#/console`) and run:

```
GET /
```

The `cluster_uuid` should differ in each tab. It should match `cluster_uuid` for that project in `.es/mt/m3/projects-eck.json`.

**Write something in one project.** A fresh cluster has no indices, and Kibana will not save a data view until the pattern matches one. In the project-a tab only:

1. Open **Stack Management > Data Views**.
2. Click **Add sample data**, then **Add data** on **Sample web logs**.
3. Come back to Data Views. You should see `kibana_sample_data_logs`.
4. Open **Stack Management > Spaces** and create a space named `mt-manual`.

In the home and project-b tabs, open the same two pages. Neither should list `kibana_sample_data_logs` or `mt-manual`. Refresh first.

**Change one project's profile.** In the project-a tab open `/security/account`. Set the avatar initials to `PA` and save. The home and project-b avatars should still show `E` after a reload.

**Log one project out.** Reload all three tabs. Each should still be logged in. In the project-a tab, open the user menu and click **Log out**. You should see **You have logged out of Elastic.** Reload the other two tabs. Both should still be logged in.

## 8. Clean up

Remove the three lines from `/etc/hosts`, then:

```bash
kubectl delete ns mt-kibana
devctl destroy <name>
```

## What you will see that is not a routing bug

- **Certificate warning.** The proxy certificate covers `mt.eu-west-1.aws.dev.elastic.cloud`, not `<project-id>.kb.<domain>`. Continuing past the warning still sends the project hostname, and the proxy routes on that.
- **Configuration recommended** toast about `server.publicBaseUrl`. Expected. One Kibana process has one public URL, and these three hostnames share that process.
- **Solution view picker.** After the first project picks a view, the others are not asked. The choice is saved only in the project that made it.
- **Advanced settings.** A value saved in one project can show up in another. The saved object is in the right cluster. The read comes from a process-wide cache.
