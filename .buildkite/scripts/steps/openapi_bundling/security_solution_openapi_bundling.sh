#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Bundling

(cd x-pack/plugins/security_solution && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true

echo -e "\n[Security Solution OpenAPI Bundling] Entity Analytics API\n"

(cd x-pack/plugins/security_solution && yarn openapi:bundle:entity-analytics)
check_for_changed_files "yarn openapi:bundle:entity-analytics" true

(cd packages/kbn-securitysolution-lists-common && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true

(cd packages/kbn-securitysolution-exceptions-common && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true