#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

is_test_execution_step

.buildkite/scripts/bootstrap.sh

# download coverage arctifacts
buildkite-agent artifact download kibana-default.tar.gz . --build "${KIBANA_BUILD_ID:-$BUILDKITE_BUILD_ID}"
# process HTML Links
.buildkite/scripts/steps/code_coverage/ingest/prokLinks.sh
# collect VCS Info
.buildkite/scripts/steps/code_coverage/ingest/collectVcsInfo.sh
# merge coverage reports
. src/dev/code_coverage/shell_scripts/extract_archives.sh
. src/dev/code_coverage/shell_scripts/merge_functional.sh
. src/dev/code_coverage/shell_scripts/copy_jest_report.sh
# zip functional combined report
tar -czf kibana-functional-coverage.tar.gz target/kibana-coverage/functional-combined/*

ls -laR target/kibana-coverage/
buildkite-agent artifact upload 'kibana-functional-coverage.tar.gz'
# upload coverage static site
#.buildkite/scripts/steps/code_coverage/ingest/uploadStaticSite.sh
#ingest results to Kibana stats cluster
#. src/dev/code_coverage/shell_scripts/generate_team_assignments_and_ingest_coverage.sh '${jobName}' ${buildNum} '${buildUrl}' '${previousSha}' '${teamAssignmentsPath}'
