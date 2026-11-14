#!/usr/bin/env bash
# Deploys one multi-tenant Kibana in front of the serverless projects that projects.sh created in a DevShard,
# and points each project's kb route at it. Project a is home.
# The config starts from home's own project Kibana config (kibana-controller's kb-kb-config). Each tenant gets its
# project's elastic/kibana token and encryption keys, so objects its own Kibana encrypted still decrypt.
# Secrets go from the cluster into the mt-kibana Secret without being printed.
#   deploy_projects.sh          deploy, or redeploy after a config change
#   deploy_projects.sh unroute  give each project's kb route back to its own Kibana
set -euo pipefail

: "${KIBANA_IMAGE:?set KIBANA_IMAGE, e.g. docker.elastic.co/kibana-ci/kibana-serverless-pr:pr-302955-<sha>}"
state=.es/mt/m3/projects-devenv.json
dir=$(dirname "$0")
mt=/usr/share/kibana/config/mt
domain=eu-west-1.aws.internal.dev.elastic.cloud
jq -e '.a.id' "$state" >/dev/null || { echo "run projects.sh create first" >&2; exit 1; }
home=$(jq -r '.a.id' "$state")

# Points (or, with "unroute", stops pointing) each project's kb route at the multi-tenant Kibana Service. This is
# how the shard's multi-tenant ingest service is routed: target_refs on the project's AppNetwork.
# kibana-controller clears target_refs again, but regional-network-controller has already copied it to the
# Ingress, which is what the proxy reads.
# The proxy adds the project's own Kibana pods to the route too, so their UI Deployment is scaled to 0.
# kibana-controller keeps a Deployment's replica count when it updates it, so that stays. Terminating pods take
# about 6 minutes (PRE_STOP_WAIT_SECONDS) to leave the route.
route() {
  local patch=$1 replicas=$2
  for id in $(jq -r '.[].id' "$state"); do
    kubectl -n "project-$id" patch appnetwork kb --type=merge -p "$patch" | grep -v 'no change' || true
    kubectl -n "project-$id" scale deploy kb-ui-kb --replicas="$replicas"
  done
}
if [ "${1:-}" = unroute ]; then
  route '{"spec":{"target_refs":null}}' 1
  exit 0
fi

project_yml() { kubectl -n "project-$1" get secret kb-kb-config -o jsonpath='{.data.kibana\.yml}' | base64 -d; }

# tenants.yml, keyed by project id: the header the Cloud Proxy sets. projectName is what the project picker shows,
# taken from the project's own Kibana, so each tenant shows its own name instead of home's.
tenants='{}'
for id in $(jq -r '.[].id' "$state"); do
  tenants=$(project_yml "$id" | yq -o=json '{
      "hosts": ["https://'"$id.es.$domain"'"],
      "serviceAccountToken": .elasticsearch.serviceAccountToken,
      "encryptionKey": .xpack.encryptedSavedObjects.encryptionKey,
      "securityEncryptionKey": .xpack.security.encryptionKey,
      "projectName": .xpack.cloud.serverless.project_name
    }' | jq --arg id "$id" --argjson t "$tenants" '$t + {($id): with_entries(select(.value != null))}')
done

# Home's config, minus what can't be per project in one process, with TLS to Elasticsearch verified.
# Every ES call is logged with the client that served it: tenant-<project id>, or data for the home cluster.
# server.cdn.url is cleared so Kibana serves its own assets: a PR image only has assets on the CDN if its
# Build Project Image step finished, and the browser shows "Elastic did not load properly" when they 404.
loggers=$(jq -c '[.[].id | {name: "elasticsearch.query.tenant-\(.)", level: "debug"}] +
  [{name: "elasticsearch.query.data", level: "debug"}]' "$state")
kibana_yml=$(project_yml "$home" | yq '
  del(.elasticsearch.ssl.verificationMode) |
  .elasticsearch.ssl.certificateAuthorities = ["'"$mt"'/ca_shard.crt"] |
  del(.server.publicBaseUrl) |
  del(.xpack.security.authc.providers.saml) |
  .server.cdn.url = null |
  .server.ssl.certificate = "/tls/tls.crt" | .server.ssl.key = "/tls/tls.key" |
  .tenants.file = "'"$mt"'/tenants.yml" |
  .logging.loggers = '"$loggers"'
')

# The shard's self-signed wildcard certificate covers every project's es and kb hostnames, internal ones included.
kubectl -n ingress-proxy get secret ingress-proxy-regional-cert -o jsonpath='{.data.tls\.crt}' | base64 -d >.es/mt/m3/shard.crt
secret=$(kubectl create secret generic mt-kibana-config -n mt-kibana --dry-run=client -o yaml \
  --from-literal=kibana.yml="$kibana_yml" --from-literal=tenants.yml="$(yq -P <<<"$tenants")" \
  --from-file=ca_shard.crt=.es/mt/m3/shard.crt)
hash=$(printf '%s%s' "$kibana_yml" "$tenants" | shasum -a 256 | cut -c1-16)

yq 'select(.kind == "Namespace")' "$dir/kibana.yaml" | kubectl apply -f - | grep -v unchanged || true
echo "$secret" | kubectl apply -f - | grep -v unchanged || true
# Home's client certificates (UIAM, autoops, actions) and the shard's internal CAs, at the paths its config uses.
kubectl -n "project-$home" get secret kb-kb-http -o json |
  jq '{apiVersion, kind, type, data, metadata: {name: "mt-kibana-home-http-certs", namespace: "mt-kibana"}}' |
  kubectl apply -f - | grep -v unchanged || true
kubectl -n "project-$home" get configmap cluster-internal-cas -o json |
  jq '{apiVersion, kind, data, metadata: {name: "cluster-internal-cas", namespace: "mt-kibana"}}' |
  kubectl apply -f - | grep -v unchanged || true

sed -e "s|__KIBANA_IMAGE__|$KIBANA_IMAGE|" -e "s|__APP_ID__|kb|" -e "s|__CONFIG_HASH__|$hash|" "$dir/kibana.yaml" |
  yq '(select(.kind == "Deployment") | .spec.template.spec) |= (
    .volumes += [{"name": "home-http-certs", "secret": {"secretName": "mt-kibana-home-http-certs"}},
      {"name": "trust-bundle", "configMap": {"name": "cluster-internal-cas"}}] |
    .containers[0].volumeMounts += [
      {"name": "home-http-certs", "mountPath": "/mnt/elastic-internal/http-certs", "readOnly": true},
      {"name": "trust-bundle", "mountPath": "/mnt/elastic-internal/trust-bundle", "readOnly": true}])' |
  kubectl apply -f - | grep -v unchanged || true
kubectl -n mt-kibana rollout status deploy/kibana --timeout=10m

route '{"spec":{"target_refs":[{"namespace":"mt-kibana","service_name":"kibana"}]}}' 0
