/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Minimatch } from 'minimatch';
import type { ToolingLog } from '@kbn/tooling-log';
import { filterIgnoredFiles } from '../../../../pipeline-utils/affected-packages/utils.ts';
import { expandWithImplicitConsumers } from './scout_implicit_consumers.ts';
import { SCOUT_MODULE_GRAPH_IGNORE } from './scout_module_graph_ignore.ts';

const matches = (file: string): boolean =>
  SCOUT_MODULE_GRAPH_IGNORE.some((p) => new Minimatch(p, { dot: true }).match(file));

describe('SCOUT_MODULE_GRAPH_IGNORE', () => {
  describe('documentation noise', () => {
    it('excludes README files', () => {
      expect(matches('src/core/README.md')).toBe(true);
      expect(matches('src/platform/packages/shared/kbn-scout/README')).toBe(true);
    });

    it('excludes markdown files', () => {
      expect(matches('docs/guide.md')).toBe(true);
      expect(matches('src/core/CHANGELOG.md')).toBe(true);
    });

    it('excludes CHANGELOG files', () => {
      expect(matches('CHANGELOG.asciidoc.md')).toBe(true);
      expect(matches('src/foo/CHANGELOG')).toBe(true);
    });
  });

  describe('Jest test files', () => {
    it('excludes *.test.ts files inside critical packages', () => {
      expect(
        matches(
          'src/platform/packages/shared/kbn-scout/src/tests_discovery/affected_modules.test.ts'
        )
      ).toBe(true);
      expect(matches('.buildkite/pipeline-utils/affected-packages/module_lookup.test.ts')).toBe(
        true
      );
      expect(
        matches(
          '.buildkite/pipeline-utils/ci-stats/pick_test_group_run_order/selective_testing.test.ts'
        )
      ).toBe(true);
    });
  });

  describe('source files are NOT excluded', () => {
    it('keeps regular TypeScript source files', () => {
      expect(matches('src/core/server/index.ts')).toBe(false);
      expect(matches('src/platform/packages/shared/kbn-scout/src/runner/index.ts')).toBe(false);
    });

    it('keeps Playwright spec files (handled by the tests-only path, not this filter)', () => {
      expect(
        matches(
          'src/platform/packages/shared/kbn-scout/test/scout/api/parallel_tests/auth/saml_login.spec.ts'
        )
      ).toBe(false);
    });
  });
});

describe('implicit consumers with SCOUT_MODULE_GRAPH_IGNORE applied to changed files', () => {
  const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;
  const expand = (changedFiles: string[]) =>
    expandWithImplicitConsumers(
      new Set<string>(),
      filterIgnoredFiles(changedFiles, SCOUT_MODULE_GRAPH_IGNORE),
      log
    );

  it('adds no consumers for a Jest-only change under an embeddables path', () => {
    expect(
      expand(['x-pack/platform/plugins/shared/ml/public/embeddables/anomaly_charts.test.ts'])
    ).toEqual(new Set());
  });

  it('adds no consumers for a Jest-only change under a workflow triggers path', () => {
    expect(
      expand([
        'x-pack/platform/plugins/shared/alerting/common/workflows/triggers/alert_status_changed.test.ts',
      ])
    ).toEqual(new Set());
  });

  it('still adds consumers for a source change under an embeddables path', () => {
    const expanded = expand([
      'x-pack/platform/plugins/shared/ml/public/embeddables/anomaly_charts.test.ts',
      'x-pack/platform/plugins/shared/ml/public/embeddables/anomaly_charts.ts',
    ]);

    expect(expanded.has('@kbn/dashboard-plugin')).toBe(true);
  });
});
