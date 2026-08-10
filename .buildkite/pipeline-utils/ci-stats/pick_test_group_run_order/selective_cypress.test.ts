/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isCypressRelevantPath } from './selective_cypress';

describe('isCypressRelevantPath', () => {
  describe('irrelevant paths (cannot affect Cypress)', () => {
    it.each([
      // Scout test trees (fixtures included — Cypress can't import Scout fixtures)
      'x-pack/solutions/security/plugins/security_solution/test/scout/detection_engine/ui/tests/foo.spec.ts',
      'src/platform/plugins/shared/discover/test/scout/ui/fixtures/page_objects/landing.ts',
      'src/platform/plugins/shared/discover/test/scout/.meta/ui/standard.json',
      'src/core/test/scout/api/tests/ui_settings_crud.spec.ts',
      'x-pack/solutions/security/plugins/cloud_security_posture/test/scout_with_setup/ui/tests/findings.spec.ts',
      // FTR test trees
      'x-pack/platform/test/functional/apps/index_management/home_page.ts',
      'x-pack/solutions/security/test/security_solution_endpoint/apps/endpoint/endpoint_list.ts',
      'x-pack/solutions/observability/test/api_integration/apis/slo/create_slo.ts',
      'src/platform/test/api_integration/apis/status/status.ts',
      'x-pack/platform/test/serverless/functional/test_suites/console/console.ts',
      // FTR manifests only drive the Jest/FTR orchestrator
      '.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml',
      // Documentation noise (consistent with skip_ci_on_only_changed)
      'README.md',
      'docs/extend/testing/scout-best-practices.md',
      'x-pack/solutions/security/plugins/security_solution/README.md',
    ])('%s', (path) => {
      expect(isCypressRelevantPath(path)).toBe(false);
    });
  });

  describe('relevant paths (must keep Cypress suites on)', () => {
    it.each([
      // Plugin source code
      'x-pack/solutions/security/plugins/security_solution/public/app/index.tsx',
      'src/platform/plugins/shared/discover/public/application/main.tsx',
      // Cypress trees under the FTR roots
      'x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/explore/host_details.cy.ts',
      'x-pack/solutions/security/test/osquery_cypress/runner.ts',
      'x-pack/solutions/security/test/defend_workflows_cypress/config.ts',
      'x-pack/platform/test/fleet_cypress/cli_config.ts',
      // Shared fixtures (es archives are loaded by Cypress es_archiver tasks)
      'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/data.json.gz',
      'x-pack/platform/test/fixtures/es_archives/logstash/data.json.gz',
      // Shared FTR config bases consumed by the Cypress FTR-runner configs
      'x-pack/platform/test/functional/config.base.ts',
      'x-pack/platform/test/functional/services/ml/security_common.ts',
      'x-pack/platform/test/functional/page_objects/index.ts',
      'x-pack/platform/test/serverless/shared/config.base.ts',
      'src/platform/test/common/config.js',
      // Anything unrecognised stays relevant
      'package.json',
      '.buildkite/pipelines/pull_request/security_solution/explore.yml',
    ])('%s', (path) => {
      expect(isCypressRelevantPath(path)).toBe(true);
    });
  });
});
