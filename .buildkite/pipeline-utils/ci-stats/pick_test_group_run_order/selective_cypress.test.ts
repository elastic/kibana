/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isCypressSkippableDiff } from './selective_cypress';

describe('isCypressSkippableDiff', () => {
  it('returns false for an empty diff (no signal)', () => {
    expect(isCypressSkippableDiff([])).toBe(false);
  });

  it('returns true for a Scout-tests-only diff', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/solutions/security/plugins/security_solution/test/scout/detection_engine/ui/tests/foo.spec.ts',
      ])
    ).toBe(true);
  });

  it('returns true for Scout fixtures (not importable from Cypress, unlike other plugins)', () => {
    expect(
      isCypressSkippableDiff([
        'src/platform/plugins/shared/discover/test/scout/ui/fixtures/page_objects/landing.ts',
      ])
    ).toBe(true);
  });

  it('returns true for an FTR-only diff', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/platform/test/functional/apps/index_management/home_page.ts',
        'x-pack/solutions/security/test/security_solution_endpoint/apps/endpoint/endpoint_list.ts',
        'src/platform/test/api_integration/apis/status/status.ts',
      ])
    ).toBe(true);
  });

  it('returns true for a mixed Scout + FTR diff (e.g. an FTR-to-Scout migration)', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/platform/plugins/shared/index_management/test/scout/ui/tests/data_streams.spec.ts',
        'x-pack/platform/test/functional/apps/index_management/data_streams.ts',
        '.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml',
      ])
    ).toBe(true);
  });

  it('treats README / *.md / CHANGELOG as noise (still true if every other file is in scope)', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/platform/test/functional/apps/index_management/README.md',
        'x-pack/platform/test/functional/apps/index_management/home_page.ts',
      ])
    ).toBe(true);
  });

  it('returns false when the diff is noise-only (no test-tree signal)', () => {
    expect(
      isCypressSkippableDiff(['README.md', 'docs/extend/testing/scout-best-practices.md'])
    ).toBe(false);
  });

  it('returns false when plugin source code changes alongside tests', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/platform/test/functional/apps/index_management/home_page.ts',
        'x-pack/solutions/security/plugins/security_solution/public/app/index.tsx',
      ])
    ).toBe(false);
  });

  it('returns false for changes inside Cypress trees under the FTR roots', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/explore/host_details.cy.ts',
      ])
    ).toBe(false);
    expect(
      isCypressSkippableDiff(['x-pack/solutions/security/test/osquery_cypress/runner.ts'])
    ).toBe(false);
    expect(
      isCypressSkippableDiff(['x-pack/solutions/security/test/defend_workflows_cypress/config.ts'])
    ).toBe(false);
    expect(isCypressSkippableDiff(['x-pack/platform/test/fleet_cypress/cli_config.ts'])).toBe(
      false
    );
  });

  it('returns false for shared fixtures (es archives are loaded by Cypress es_archiver tasks)', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/data.json.gz',
      ])
    ).toBe(false);
    expect(
      isCypressSkippableDiff(['x-pack/platform/test/fixtures/es_archives/logstash/data.json.gz'])
    ).toBe(false);
  });

  it('returns false for shared FTR config bases consumed by the Cypress FTR-runner configs', () => {
    expect(isCypressSkippableDiff(['x-pack/platform/test/functional/config.base.ts'])).toBe(false);
    expect(
      isCypressSkippableDiff(['x-pack/platform/test/functional/services/ml/security_common.ts'])
    ).toBe(false);
    expect(isCypressSkippableDiff(['x-pack/platform/test/functional/page_objects/index.ts'])).toBe(
      false
    );
    expect(isCypressSkippableDiff(['x-pack/platform/test/serverless/shared/config.base.ts'])).toBe(
      false
    );
    expect(isCypressSkippableDiff(['src/platform/test/common/config.js'])).toBe(false);
  });

  it('returns false when a skippable file is mixed with a Cypress-relevant one', () => {
    expect(
      isCypressSkippableDiff([
        'x-pack/platform/test/functional/apps/index_management/home_page.ts',
        'x-pack/solutions/security/test/security_solution_cypress/cypress/tasks/login.ts',
      ])
    ).toBe(false);
  });
});
