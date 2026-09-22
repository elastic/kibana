/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { humanizeModuleId, moduleLabelForPath } from './module_label';

describe('humanizeModuleId', () => {
  it('turns plugin ids and package names into words', () => {
    expect(humanizeModuleId('lens')).toBe('Lens');
    expect(humanizeModuleId('dataViews')).toBe('Data Views');
    expect(humanizeModuleId('securitySolution')).toBe('Security Solution');
    expect(humanizeModuleId('@kbn/scout-reporting')).toBe('Scout Reporting');
    expect(humanizeModuleId('@kbn/core-http_server')).toBe('Core Http Server');
  });
});

describe('moduleLabelForPath', () => {
  it('names the plugin owning a file, or the package outside plugins', () => {
    expect(
      moduleLabelForPath(
        'src/platform/plugins/shared/discover/test/scout/core/ui/parallel_tests/histogram_session.spec.ts'
      )
    ).toBe('Discover');
    expect(
      moduleLabelForPath('packages/kbn-failed-test-reporter-cli/flaky_test_issues/reporter.ts')
    ).toBe('Failed Test Reporter Cli');
  });

  it('is undefined for files outside any module', () => {
    expect(moduleLabelForPath('scripts/report_flaky_test_issues.js')).toBeUndefined();
  });
});
