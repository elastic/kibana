#!/usr/bin/env bash
set -euo pipefail

.buildkite/scripts/bootstrap.sh

SO_MIGRATIONS_SNAPSHOT_FOLDER=kibana-so-types-snapshots
SNAPSHOT_FILE_PATH="${1:-target/plugin_so_types_snapshot.json}"

echo "--- Creating snapshot of Saved Object migration info"
node scripts/snapshot_plugin_types --outputPath "$SNAPSHOT_FILE_PATH"

echo "--- Uploading as ${BUILDKITE_COMMIT}.json"
SNAPSHOT_PATH="${SO_MIGRATIONS_SNAPSHOT_FOLDER}/${BUILDKITE_COMMIT}.json"
gsutil cp "$SNAPSHOT_FILE_PATH" "gs://$SNAPSHOT_PATH"

buildkite-agent annotate --context so_migration_snapshot --style success \
  'Saved Object type snapshot is available at <a href="https://storage.cloud.google.com/'"$SNAPSHOT_PATH"'">'"$SNAPSHOT_PATH"'</a>'

echo "Success!"
