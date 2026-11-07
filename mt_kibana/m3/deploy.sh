#!/usr/bin/env bash
# Deploys the multi-tenant Kibana to the current kube context, with the ECK clusters from eck.sh as tenants.
# The home project is mt-home. Every project gets a proxy Ingress, so <project-id>.<APP_ID>.<domain> reaches Kibana.
# Tenants other than home are first initialised by a one-off single-tenant Kibana Job, like M1's init_tenant.sh.
set -euo pipefail

: "${KIBANA_IMAGE:?set KIBANA_IMAGE, e.g. docker.elastic.co/kibana-ci/kibana-serverless-pr:pr-302955-<sha>}"
app_id=${APP_ID:-mtkb}
state=.es/mt/m3/projects-eck.json
dir=$(dirname "$0")
mt=/usr/share/kibana/config/mt
jq -e '.home.serviceAccountToken' "$state" >/dev/null || { echo "run eck.sh create first" >&2; exit 1; }

# One saved objects key and one session key per project, kept in the state file so redeploys can still decrypt.
for n in $(jq -r 'keys[]' "$state"); do
  for key in encryptionKey securityEncryptionKey; do
    if [ "$(jq -r --arg n "$n" --arg key "$key" '.[$n][$key] // empty' "$state")" = "" ]; then
      jq --arg n "$n" --arg key "$key" --arg k "$(openssl rand -hex 16)" '.[$n][$key] = $k' "$state" >"$state.tmp"
      mv "$state.tmp" "$state"
    fi
  done
done
chmod 600 "$state"

# Each ECK cluster has its own CA. Tenant clients inherit elasticsearch.ssl from the base config, so list them all.
ca_files=()
ca_paths=()
for n in $(jq -r 'keys[]' "$state"); do
  ca_files+=(--from-file="ca_$n.crt=.es/mt/m3/eck_ca_$n.crt")
  ca_paths+=("\"$mt/ca_$n.crt\"")
done
cas="[$(IFS=,; echo "${ca_paths[*]}")]"

# projectName is what the project picker shows, for example mt-b.
tenants=$(jq '[to_entries[] | .key as $n | .value | {key: .id, value: {hosts: [.es], serviceAccountToken,
  encryptionKey, securityEncryptionKey, projectName: "mt-\($n)"}}] | from_entries' "$state")
kibana_yml=$(jq -r --arg sec "$(openssl rand -hex 16)" --arg rep "$(openssl rand -hex 16)" --arg cas "$cas" \
  --arg mt "$mt" '.home as $h | [
  "server.host: 0.0.0.0",
  "server.protocol: http1",
  "server.ssl.enabled: true",
  "server.ssl.certificate: /tls/tls.crt",
  "server.ssl.key: /tls/tls.key",
  "elasticsearch.hosts: [\"\($h.es)\"]",
  "elasticsearch.serviceAccountToken: \"\($h.serviceAccountToken)\"",
  "elasticsearch.ssl.certificateAuthorities: \($cas)",
  "tenants.file: \($mt)/tenants.yml",
  "xpack.encryptedSavedObjects.encryptionKey: \($h.encryptionKey)",
  "xpack.security.encryptionKey: \($sec)",
  "xpack.reporting.encryptionKey: \($rep)",
  "# Logs every ES call per tenant client, so the demo can show which project a request went to.",
  "logging.loggers: [\([.[] | "{name: elasticsearch.query.tenant-\(.id), level: debug}"] | join(", "))]"
] | join("\n")' "$state")

secret=$(kubectl create secret generic mt-kibana-config -n mt-kibana --dry-run=client -o yaml \
  --from-literal=kibana.yml="$kibana_yml" --from-literal=tenants.yml="$tenants" "${ca_files[@]}")
hash=$(printf '%s%s' "$kibana_yml" "$tenants" | shasum -a 256 | cut -c1-16)

# The Secret goes in before the Deployment: updating a subPath-mounted Secret under a running pod breaks its restarts.
yq 'select(.kind == "Namespace")' "$dir/kibana.yaml" | kubectl apply -f - | grep -v unchanged || true
echo "$secret" | kubectl apply -f - | grep -v unchanged || true

# Single-tenant Kibana boots against each uninitialised tenant until it's available. That creates the .kibana*
# indices and registers Kibana's privileges, which the multi-tenant Kibana only does for home.
for n in $(jq -r 'keys[] | select(. != "home")' "$state"); do
  [ "$(jq -r --arg n "$n" '.[$n].initialised // false' "$state")" = true ] && continue
  init_yml=$(jq -r --arg n "$n" --arg mt "$mt" '.[$n] | [
    "server.host: 127.0.0.1",
    "elasticsearch.hosts: [\"\(.es)\"]",
    "elasticsearch.serviceAccountToken: \"\(.serviceAccountToken)\"",
    "elasticsearch.ssl.certificateAuthorities: [\"\($mt)/ca_\($n).crt\"]",
    "xpack.encryptedSavedObjects.encryptionKey: \(.encryptionKey)"
  ] | join("\n")' "$state")
  kubectl -n mt-kibana create secret generic "mt-kibana-init-$n" --dry-run=client -o yaml \
    --from-literal=kibana.yml="$init_yml" "${ca_files[@]}" | kubectl apply -f - | grep -v unchanged || true
  kubectl -n mt-kibana delete job "init-$n" --ignore-not-found >/dev/null
  sed -e "s|__KIBANA_IMAGE__|$KIBANA_IMAGE|" -e "s|__NAME__|$n|g" "$dir/init_job.yaml" | kubectl apply -f -
done
for n in $(jq -r 'keys[] | select(. != "home")' "$state"); do
  [ "$(jq -r --arg n "$n" '.[$n].initialised // false' "$state")" = true ] && continue
  echo "initialising mt-$n"
  if ! kubectl -n mt-kibana wait "job/init-$n" --for=condition=Complete --timeout=15m; then
    kubectl -n mt-kibana logs "job/init-$n" --tail=40 >&2
    exit 1
  fi
  jq --arg n "$n" '.[$n].initialised = true' "$state" >"$state.tmp" && mv "$state.tmp" "$state"
done

sed -e "s|__KIBANA_IMAGE__|$KIBANA_IMAGE|" -e "s|__APP_ID__|$app_id|" -e "s|__CONFIG_HASH__|$hash|" \
  "$dir/kibana.yaml" | kubectl apply -f - | grep -v unchanged || true

# regional-network-controller would create these from an AppNetwork. The proxy only reads the annotations.
jq -c '.[]' "$state" | while read -r p; do
  id=$(jq -r .id <<<"$p")
  alias=$(jq -r .alias <<<"$p")
  kubectl apply -f - <<EOF | grep -v unchanged || true
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: project-$id
  namespace: mt-kibana
  annotations:
    k8s.elastic.co/project-id: '$id'
    k8s.elastic.co/project-alias: '$alias'
    k8s.elastic.co/project-type: elasticsearch
    k8s.elastic.co/application-id: $app_id
    k8s.elastic.co/appstatus: Running
    k8s.elastic.co/target-refs: mt-kibana/kibana
spec:
  defaultBackend:
    service: { name: kibana, port: { name: https } }
EOF
done

kubectl -n mt-kibana rollout status deploy/kibana --timeout=10m
