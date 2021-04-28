#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/util.sh

.buildkite/scripts/bootstrap.sh

echo "--- Check Bundle Limits"
node scripts/build_kibana_platform_plugins --validate-limits


echo "--- Check Doc API Changes"
node scripts/check_published_api_changes


echo "--- Check File Casing"
node scripts/check_file_casing --quiet


# TODO this thing is loud
echo "--- Check i18n"
node scripts/i18n_check --ignore-missing > /dev/null


echo "--- Check Jest Configs"
node scripts/check_jest_configs

echo "--- Check kbn-pm distributable"
yarn kbn run build -i @kbn/pm
verify_no_git_changes 'yarn kbn run build -i @kbn/pm'

echo "--- Check Licenses"
node scripts/check_licenses --dev

echo "--- Check plugin list docs"
node scripts/build_plugin_list_docs
verify_no_git_changes 'node scripts/build_plugin_list_docs'

echo "--- Check api docs"
node scripts/build_api_docs


echo "--- Check Plugins With Circular Dependencies"
node scripts/find_plugins_with_circular_deps


echo "--- Check Telemetry Schema"
node scripts/telemetry_check


echo "--- Test Hardening"
node scripts/test_hardening


echo "--- Test Projects"
yarn kbn run test --exclude kibana --oss --skip-kibana-plugins --skip-missing


echo "--- Check TypeScript Projects"
node scripts/check_ts_projects


# echo "--- Build TS Refs"
# node scripts/build_ts_refs \
#     --ignore-type-failures \
#     --clean \
#     --no-cache \
#     --force \
#     --debug

# echo "--- Check Types"
# node scripts/type_check


echo "--- Verify NOTICE"
node scripts/notice --validate
