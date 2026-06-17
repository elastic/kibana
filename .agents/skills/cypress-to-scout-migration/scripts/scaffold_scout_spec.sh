#!/usr/bin/env bash
# Generates a Scout spec file with proper boilerplate for any Kibana plugin.
#
# Usage:
#   bash .agents/skills/cypress-to-scout-migration/scripts/scaffold_scout_spec.sh \
#     --name timeline_creation \
#     --domain investigations/timelines \
#     --plugin-test-dir x-pack/solutions/security/plugins/security_solution/test/scout/ui \
#     --type parallel
#
# Options:
#   --name            Spec name in snake_case (required)
#   --domain          Subdirectory path under parallel_tests/ or tests/ (required)
#   --plugin-test-dir Path to the plugin's test/scout/ui directory (required)
#   --type            "parallel" (default) or "sequential"
#   --scout-package   Scout package to import from (default: @kbn/scout)

set -euo pipefail

SPEC_NAME=""
DOMAIN=""
TEST_TYPE="parallel"
PLUGIN_TEST_DIR=""
SCOUT_PACKAGE="@kbn/scout-security"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)            SPEC_NAME="$2"; shift 2 ;;
    --domain)          DOMAIN="$2"; shift 2 ;;
    --plugin-test-dir) PLUGIN_TEST_DIR="$2"; shift 2 ;;
    --type)            TEST_TYPE="$2"; shift 2 ;;
    --scout-package)   SCOUT_PACKAGE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$SPEC_NAME" || -z "$DOMAIN" || -z "$PLUGIN_TEST_DIR" ]]; then
  echo "Error: --name, --domain, and --plugin-test-dir are required"
  echo "Usage: $0 --name <spec_name> --domain <domain_path> --plugin-test-dir <path> [--type parallel|sequential] [--scout-package <pkg>]"
  exit 1
fi

if [[ "$TEST_TYPE" == "parallel" ]]; then
  TARGET_DIR="${PLUGIN_TEST_DIR}/parallel_tests/${DOMAIN}"
  TEST_FN="spaceTest"
else
  TARGET_DIR="${PLUGIN_TEST_DIR}/tests/${DOMAIN}"
  TEST_FN="test"
fi

SPEC_FILE="${TARGET_DIR}/${SPEC_NAME}.spec.ts"

if [[ -f "$SPEC_FILE" ]]; then
  echo "Error: ${SPEC_FILE} already exists"
  exit 1
fi

mkdir -p "$TARGET_DIR"

cat > "$SPEC_FILE" << TEMPLATE
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

TEMPLATE

if [[ "$TEST_TYPE" == "parallel" ]]; then
  cat >> "$SPEC_FILE" << PARALLEL
import { spaceTest, tags } from '${SCOUT_PACKAGE}';
import { expect } from '${SCOUT_PACKAGE}/ui';

spaceTest.describe(
  'TODO: describe suite',
  { tag: [/* TODO: add tags e.g. ...tags.stateful.classic */] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      // TODO: API-based setup
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      // TODO: clean up ALL created data
    });

    spaceTest('TODO: test name', async ({ pageObjects, page }) => {
      await spaceTest.step('TODO: first step', async () => {
        // TODO: implement
      });
    });
  }
);
PARALLEL
else
  cat >> "$SPEC_FILE" << SEQUENTIAL
import { test, tags } from '${SCOUT_PACKAGE}';
import { expect } from '${SCOUT_PACKAGE}/ui';

test.describe(
  'TODO: describe suite',
  { tag: [/* TODO: add tags e.g. ...tags.stateful.classic */] },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices }) => {
      // TODO: API-based setup
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ apiServices }) => {
      // TODO: clean up ALL created data
    });

    test('TODO: test name', async ({ pageObjects, page }) => {
      await test.step('TODO: first step', async () => {
        // TODO: implement
      });
    });
  }
);
SEQUENTIAL
fi

echo "Created: ${SPEC_FILE}"
echo ""
echo "Next steps:"
echo "  1. Replace all TODO placeholders"
echo "  2. Add page objects if needed (see assets/page_object_template.ts)"
echo "  3. Add API services if needed (see assets/api_service_template.ts)"
echo "  4. Run: node scripts/scout.js update-test-config-manifests"
