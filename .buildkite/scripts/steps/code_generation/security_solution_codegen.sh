#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Security Solution OpenAPI Code Generation

echo OpenAPI Common Package

(cd packages/kbn-openapi-common && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true

echo Lists API Common Package

(cd packages/kbn-securitysolution-lists-common && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true

echo Security Solution Plugin

(cd x-pack/plugins/security_solution && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true