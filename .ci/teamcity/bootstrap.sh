#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "${0}")/util.sh"

tc_start_block "Bootstrap"

tc_start_block "yarn install and kbn bootstrap"
verify_no_git_changes yarn kbn bootstrap --prefer-offline
tc_end_block "yarn install and kbn bootstrap"

tc_start_block "build kbn-pm"
verify_no_git_changes yarn kbn run build -i @kbn/pm
tc_end_block "build kbn-pm"

tc_start_block "build plugin list docs"
verify_no_git_changes node scripts/build_plugin_list_docs
tc_end_block "build plugin list docs"

tc_end_block "Bootstrap"
