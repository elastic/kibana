#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh
source .buildkite/scripts/common/env.sh
source .buildkite/scripts/common/setup_node.sh

export FORCE_BOOTSTRAP_REMOTE_CACHE=true

yarn kbn bootstrap

for version in $(cat versions.json | jq -r '.versions[].version'); do
  node scripts/es snapshot --download-only --base-path "$ES_CACHE_DIR" --version "$version"
done

echo "--- Logging into vault to access private repos"
VAULT_ROLE_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-role-id)"
VAULT_SECRET_ID="$(retry 5 15 gcloud secrets versions access latest --secret=kibana-buildkite-vault-secret-id)"
VAULT_TOKEN=$(retry 5 30 vault write -field=token auth/approle/login role_id="$VAULT_ROLE_ID" secret_id="$VAULT_SECRET_ID")
retry 5 30 vault login -no-print "$VAULT_TOKEN"

GITHUB_TOKEN="$(retry 5 5 vault read -field=github_token secret/kibana-issues/dev/kibanamachine)"
export GITHUB_TOKEN

echo "--- Cloning repos for docs build"
node scripts/validate_next_docs --clone-only
