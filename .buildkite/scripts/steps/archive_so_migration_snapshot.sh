#!/usr/bin/env bash
set -euo pipefail

.buildkite/scripts/bootstrap.sh

SO_MIGRATIONS_SNAPSHOT_FOLDER=kibana-so-types-snapshots

echo "--Creating snapshot of Saved Object migration info"
node scripts/snapshot_plugin_types --outputPath "$1"

echo "--Uploading as ${BUILDKITE_COMMIT}.json"
SNAPSHOT_PATH="${SO_MIGRATIONS_SNAPSHOT_FOLDER}/${BUILDKITE_COMMIT}.json"
gsutil cp "$1" "gs://$SNAPSHOT_PATH"

buildkite-agent annotate --context so_migration_snapshot --style success \
  'Snapshot is available at <a href="https://storage.cloud.google.com/'"$SNAPSHOT_PATH"'">'"$SNAPSHOT_PATH"'</a>'
