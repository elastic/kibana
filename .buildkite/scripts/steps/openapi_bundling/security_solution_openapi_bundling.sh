#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Bundling

echo -e "\n[Security Solution OpenAPI Bundling] Detections API\n"
(cd x-pack/plugins/security_solution && yarn openapi:bundle:detections)

echo -e "\n[Security Solution OpenAPI Bundling] Timeline API\n"
(cd x-pack/plugins/security_solution && yarn openapi:bundle:timeline)

echo -e "\n[Security Solution OpenAPI Bundling] Entity Analytics API\n"
(cd x-pack/plugins/security_solution && yarn openapi:bundle:entity-analytics)

echo -e "\n[Security Solution OpenAPI Bundling] Lists API\n"
(cd packages/kbn-securitysolution-lists-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Exceptions API\n"
(cd packages/kbn-securitysolution-exceptions-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Endpoint Exceptions API\n"
(cd packages/kbn-securitysolution-endpoint-exceptions-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Endpoint Management API\n"
(cd x-pack/plugins/security_solution && yarn openapi:bundle:endpoint-management)

echo -e "\n[Security Solution OpenAPI Bundling] Elastic Assistant API\n"
(cd x-pack/packages/kbn-elastic-assistant-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Osquery API\n"
(cd x-pack/plugins/osquery && yarn openapi:bundle)

check_for_changed_files "yarn openapi:bundle" true
