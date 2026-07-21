/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FTR_EXCLUDED_MODULES, shouldSkipFtrTests } from './selective_ftr';

describe('FTR_EXCLUDED_MODULES', () => {
  const FTR_FRAMEWORK_AND_SUITES = [
    '@kbn/test',
    '@kbn/ftr-common-functional-services',
    '@kbn/test-suites-src',
    '@kbn/test-suites-xpack-platform',
    '@kbn/journeys',
  ];

  it('does not include FTR framework or suite packages', () => {
    for (const id of FTR_FRAMEWORK_AND_SUITES) {
      expect(FTR_EXCLUDED_MODULES.has(id)).toBe(false);
    }
  });

  it('does not include FTR runtime deps', () => {
    expect(FTR_EXCLUDED_MODULES.has('@kbn/scout-info')).toBe(false);
    expect(FTR_EXCLUDED_MODULES.has('@kbn/scout-reporting')).toBe(false);
    expect(FTR_EXCLUDED_MODULES.has('@kbn/test-jest-helpers')).toBe(false);
  });

  it('does not include runtime plugins', () => {
    expect(FTR_EXCLUDED_MODULES.has('@kbn/evals-plugin')).toBe(false);
  });

  it('includes Scout / Jest / Cypress / evals helpers', () => {
    expect(FTR_EXCLUDED_MODULES.has('@kbn/scout')).toBe(true);
    expect(FTR_EXCLUDED_MODULES.has('@kbn/test-eui-helpers')).toBe(true);
    expect(FTR_EXCLUDED_MODULES.has('@kbn/cypress-test-helper')).toBe(true);
    expect(FTR_EXCLUDED_MODULES.has('@kbn/evals')).toBe(true);
  });
});

describe('shouldSkipFtrTests', () => {
  it('returns false for an empty changed-files list', () => {
    expect(shouldSkipFtrTests(new Set(['@kbn/scout']), [])).toBe(false);
  });

  it('returns true when all affected modules are excluded', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout', '@kbn/test-eui-helpers']), [
        'src/platform/packages/shared/kbn-scout/src/index.ts',
      ])
    ).toBe(true);
  });

  it('returns false when FTR runtime deps are affected', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout-info']), [
        'src/platform/packages/private/kbn-scout-info/src/index.ts',
      ])
    ).toBe(false);
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout-reporting']), [
        'src/platform/packages/private/kbn-scout-reporting/src/index.ts',
      ])
    ).toBe(false);
    expect(
      shouldSkipFtrTests(new Set(['@kbn/test-jest-helpers']), [
        'src/platform/packages/shared/kbn-test-jest-helpers/src/index.ts',
      ])
    ).toBe(false);
  });

  it('returns false when any affected module is not excluded', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout', '@kbn/dashboard-plugin']), [
        'src/platform/packages/shared/kbn-scout/src/index.ts',
        'src/platform/plugins/shared/dashboard/public/plugin.ts',
      ])
    ).toBe(false);
  });

  it('returns false when a critical path is touched even if modules are excluded', () => {
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout']), [
        'src/platform/packages/shared/kbn-scout/src/index.ts',
        'yarn.lock',
      ])
    ).toBe(false);
    expect(
      shouldSkipFtrTests(new Set(['@kbn/scout']), [
        '.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml',
      ])
    ).toBe(false);
  });

  it('returns true for docs / CI / ownership-only diffs with no categorized modules', () => {
    expect(
      shouldSkipFtrTests(new Set(), [
        'docs/extend/testing.md',
        'fleet_packages.json',
        '.buildkite/pipeline-resource-definitions/kibana-es-snapshots.yml',
        'CODEOWNERS',
      ])
    ).toBe(true);
  });

  it('returns true for i18nrc-only diffs', () => {
    expect(shouldSkipFtrTests(new Set(), ['x-pack/.i18nrc.json', '.i18nrc.json'])).toBe(true);
  });

  it('returns false for uncategorized diffs that are not irrelevant noise', () => {
    expect(shouldSkipFtrTests(new Set(), ['some_random_root_script.sh'])).toBe(false);
  });

  it('returns false when FTR manifests change inside .buildkite', () => {
    expect(
      shouldSkipFtrTests(new Set(), [
        '.buildkite/ftr-manifests/ftr_security_stateful_configs.yml',
      ])
    ).toBe(false);
  });

  it('returns false for config/serverless.yml', () => {
    expect(shouldSkipFtrTests(new Set(), ['config/serverless.yml'])).toBe(false);
  });
});
