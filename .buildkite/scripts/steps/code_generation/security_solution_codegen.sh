#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Code Generation

echo -e "\n[Security Solution OpenAPI Code Generation] OpenAPI Common Package\n"
(cd src/platform/packages/shared/kbn-openapi-common && pnpm openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Lists Common Package\n"
(cd x-pack/solutions/security/packages/kbn-securitysolution-lists-common && pnpm openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Exceptions Common Package\n"
(cd x-pack/solutions/security/packages/kbn-securitysolution-exceptions-common && pnpm openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Endpoint Exceptions Common Package\n"
(cd x-pack/solutions/security/packages/kbn-securitysolution-endpoint-exceptions-common && pnpm openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Security Solution Plugin\n"
(cd x-pack/solutions/security/plugins/security_solution && pnpm openapi:generate)

echo -e "\n[Security Solution OpenAPI Code Generation] Entity Store Plugin\n"
(cd x-pack/solutions/security/plugins/entity_store && pnpm openapi:generate)

check_for_changed_files "pnpm openapi:generate" true
