/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAppName } from './get_app_name';

const SYSTEMPATH = 'systemPath';

const testMap = [
  ['x-pack/plugins/observability/foo/bar/baz/header_actions.tsx', 'o11y'],
  ['x-pack/plugins/apm/public/components/app/correlations/correlations_table.tsx', 'apm'],
  ['x-pack/plugins/cases/public/components/foo.tsx', 'cases'],
  ['packages/kbn-alerts-ui-shared/src/alert_lifecycle_status_badge/index.tsx', 'kbnAlertsUiShared'],
];

describe('Get App Name', () => {
  test.each(testMap)(
    'should get the responsible app name from a file path',
    (path, expectedValue) => {
      const appName = getAppName(`${SYSTEMPATH}/${path}`, SYSTEMPATH);
      expect(appName).toBe(expectedValue);
    }
  );
});
