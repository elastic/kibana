#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Bundling

echo -e "\n[Security Solution OpenAPI Bundling] Detections API\n"

(cd x-pack/plugins/security_solution && yarn openapi:bundle:detections)
check_for_changed_files "yarn openapi:bundle:detections" true

echo -e "\n[Security Solution OpenAPI Bundling] Timeline API\n"

(cd x-pack/plugins/security_solution && yarn openapi:bundle:timeline)
check_for_changed_files "yarn openapi:bundle:timeline" true

echo -e "\n[Security Solution OpenAPI Bundling] Lists API\n"

(cd packages/kbn-securitysolution-lists-common && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true

echo -e "\n[Security Solution OpenAPI Bundling] Exceptions API\n"

(cd packages/kbn-securitysolution-exceptions-common && yarn openapi:bundle)
check_for_changed_files "yarn openapi:bundle" true
