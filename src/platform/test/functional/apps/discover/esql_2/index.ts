/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Migration recommendation: DELETE this index and ./config.ts once _esql_view is resolved. Both
 * exist only to run that one file.
 *
 * Two things in the config must be carried into the Scout port deliberately, not by reflex:
 * - `--feature_flags.overrides.discover.cascadeLayoutEnabled=false`. Confirm whether the assertions
 *   still hold with the cascade layout enabled before pinning the flag again.
 * - `xpack.security.enabled=true` on the ES cluster, plus the `kibana_admin` /
 *   `test_logstash_reader` / `kibana_sample_read` roles set in the suite's `before`. No test here
 *   asserts privilege-dependent behavior, so a standard Scout `browserAuth` role should be enough.
 *
 * Audit summary for _esql_view.ts (28 tests) — see the file for per-test rationale:
 * - ES|QL in Discover (9): migrate, collapsing three near-duplicate pairs
 * - resource browser (1): cover with a unit test (focus management)
 * - errors (1): cover with unit tests, then delete
 * - switching to a data view (3): migrate as 2 specs
 * - inspector (2): migrate; stub the slow query instead of sleeping
 * - query history (4): mostly unit tested already; keep 1 in the browser
 * - sorting (2): migrate, split into 3 specs and parametrize
 * - filtering by clicking the table in Discover (4): 1 delete, rest migrate; strings already unit tested
 * - filtering by clicking the table in Dashboards (1): migrate, replace CSS selectors
 * - histogram breakdown (4): migrate as one stepped spec
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');

  describe('discover/esql_2', function () {
    before(async function () {
      await browser.setWindowSize(1600, 1200);
    });

    loadTestFile(require.resolve('./_esql_view'));
  });
}
