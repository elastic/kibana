#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Bundling

echo -e "\n[Security Solution OpenAPI Bundling] Detections API\n"
(cd x-pack/solutions/security/plugins/security_solution && yarn openapi:bundle:detections)

echo -e "\n[Security Solution OpenAPI Bundling] Timeline API\n"
(cd x-pack/solutions/security/plugins/security_solution && yarn openapi:bundle:timeline)

echo -e "\n[Security Solution OpenAPI Bundling] Entity Analytics API\n"
(cd x-pack/solutions/security/plugins/security_solution && yarn openapi:bundle:entity-analytics)

echo -e "\n[Security Solution OpenAPI Bundling] Lists API\n"
(cd x-pack/solutions/security/packages/kbn-securitysolution-lists-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Exceptions API\n"
(cd x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Endpoint Exceptions API\n"
(cd x-pack/solutions/security/packages/kbn-securitysolution-endpoint-exceptions-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Endpoint Management API\n"
(cd x-pack/solutions/security/plugins/security_solution && yarn openapi:bundle:endpoint-management)

echo -e "\n[Security Solution OpenAPI Bundling] Elastic Assistant API\n"
(cd x-pack/platform/packages/shared/kbn-elastic-assistant-common && yarn openapi:bundle)

echo -e "\n[Security Solution OpenAPI Bundling] Osquery API\n"
(cd x-pack/platform/plugins/shared/osquery && yarn openapi:bundle)

check_for_changed_files "yarn openapi:bundle" true
