#!/usr/bin/env bash

set -euo pipefail

export DISABLE_BOOTSTRAP_VALIDATION=false
.buildkite/scripts/bootstrap.sh

.buildkite/scripts/steps/checks/commit/commit.sh
.buildkite/scripts/steps/checks/no_codeowners.sh
.buildkite/scripts/steps/checks/bazel_packages.sh
.buildkite/scripts/steps/checks/telemetry.sh
.buildkite/scripts/steps/checks/ts_projects.sh
.buildkite/scripts/steps/checks/jest_configs.sh
.buildkite/scripts/steps/checks/doc_api_changes.sh
.buildkite/scripts/steps/checks/kbn_pm_dist.sh
.buildkite/scripts/steps/checks/plugin_list_docs.sh
.buildkite/scripts/steps/checks/check_types.sh
.buildkite/scripts/steps/checks/bundle_limits.sh
.buildkite/scripts/steps/checks/i18n.sh
.buildkite/scripts/steps/checks/file_casing.sh
.buildkite/scripts/steps/checks/licenses.sh
.buildkite/scripts/steps/checks/plugins_with_circular_deps.sh
.buildkite/scripts/steps/checks/verify_notice.sh
.buildkite/scripts/steps/checks/test_projects.sh
.buildkite/scripts/steps/checks/test_hardening.sh
