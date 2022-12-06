#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Check Framework Alerts as Data Schema

./x-pack/plugins/alerting/common/alert_schema/scripts/generate_schemas.sh

check_for_changed_files 'node x-pack/plugins/event_log/scripts/create_schemas.js' false 'Follow the directions in x-pack/plugins/alerting/common/alert_schema/scripts/README.md to make schema changes to framework alerts as data.'
