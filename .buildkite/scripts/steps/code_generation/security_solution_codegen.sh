#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Code Generation

echo -e "\n[Security Solution OpenAPI Code Generation] OpenAPI Common Package\n"
(cd packages/kbn-openapi-common && yarn openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Lists Common Package\n"
(cd packages/kbn-securitysolution-lists-common && yarn openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Exceptions Common Package\n"
(cd packages/kbn-securitysolution-exceptions-common && yarn openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Endpoint Exceptions Common Package\n"
(cd packages/kbn-securitysolution-endpoint-exceptions-common && yarn openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Security Solution Plugin\n"
(cd x-pack/plugins/security_solution && yarn openapi:generate)

check_for_changed_files "yarn openapi:generate" true