#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Bundling

echo -e "\n[Security Solution OpenAPI Bundling] Detections API\n"

(cd x-pack/plugins/security_solution && yarn openapi:bundle:detections)
check_for_changed_files "yarn openapi:bundle:detections" true

echo -e "\n[Security Solution OpenAPI Bundling] Entity Analytics API\n"

(cd x-pack/plugins/security_solution && yarn openapi:bundle:entity-analytics)
check_for_changed_files "yarn openapi:bundle:entity-analytics" true

echo -e "\n[Security Solution OpenAPI Bundling] Lists API\n"

echo -e "\n[Security Solution OpenAPI Bundling] Endpoint Management API\n"

(cd x-pack/plugins/security_solution && yarn openapi:bundle:endpoint-management)
check_for_changed_files "yarn openapi:bundle:endpoint-management" true

(cd packages/kbn-securitysolution-lists-common && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true

echo -e "\n[Security Solution OpenAPI Bundling] Exceptions API\n"

(cd packages/kbn-securitysolution-exceptions-common && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true

echo -e "\n[Security Solution OpenAPI Bundling] Elastic Assistant API\n"

(cd x-pack/packages/kbn-elastic-assistant-common && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true

echo -e "\n[Security Solution OpenAPI Bundling] Osquery API\n"

(cd x-pack/plugins/osquery && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true
