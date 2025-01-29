#!/usr/bin/env bash
set -euo pipefail

.buildkite/scripts/bootstrap.sh

SO_MIGRATIONS_SNAPSHOT_BUCKET="gs://kibana-so-types-snapshots"
SNAPSHOT_FILE_PATH="${1:-target/plugin_so_types_snapshot.json}"

echo "--- Creating snapshot of Saved Object migration info"
node scripts/snapshot_plugin_types snapshot --outputPath "$SNAPSHOT_FILE_PATH"

echo "--- Uploading as ${BUILDKITE_COMMIT}.json"
SNAPSHOT_PATH="${SO_MIGRATIONS_SNAPSHOT_BUCKET}/${BUILDKITE_COMMIT}.json"
.buildkite/scripts/common/activate_service_account.sh "$SO_MIGRATIONS_SNAPSHOT_BUCKET"
gsutil cp "$SNAPSHOT_FILE_PATH" "$SNAPSHOT_PATH"

buildkite-agent annotate --context so_migration_snapshot --style success \
  'Saved Object type snapshot is available at <a href="https://storage.cloud.google.com/'"$SNAPSHOT_PATH"'">'"$SNAPSHOT_PATH"'</a>'

echo "Success!"
