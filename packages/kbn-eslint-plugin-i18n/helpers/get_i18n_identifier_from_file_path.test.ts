/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getI18nIdentifierFromFilePath } from './get_i18n_identifier_from_file_path';

const SYSTEMPATH = 'systemPath';

const testMap = [
  ['x-pack/plugins/observability/foo/bar/baz/header_actions.tsx', 'xpack.observability'],
  ['x-pack/plugins/apm/public/components/app/correlations/correlations_table.tsx', 'xpack.apm'],
  ['x-pack/plugins/cases/public/components/foo.tsx', 'xpack.cases'],
  [
    'x-pack/plugins/synthetics/public/apps/synthetics/components/alerts/toggle_alert_flyout_button.tsx',
    'xpack.synthetics',
  ],
  [
    'packages/kbn-alerts-ui-shared/src/alert_lifecycle_status_badge/index.tsx',
    'app_not_found_in_i18nrc',
  ],
];

describe('Get i18n Identifier for file', () => {
  test.each(testMap)(
    'should get the right i18n identifier for a file inside an x-pack plugin',
    (path, expectedValue) => {
      const appName = getI18nIdentifierFromFilePath(`${SYSTEMPATH}/${path}`, SYSTEMPATH);
      expect(appName).toBe(expectedValue);
    }
  );
});
