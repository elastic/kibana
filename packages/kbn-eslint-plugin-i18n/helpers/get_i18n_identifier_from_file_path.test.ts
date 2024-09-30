/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getI18nIdentifierFromFilePath } from './get_i18n_identifier_from_file_path';

const SYSTEMPATH = 'systemPath';

const testMap = [
  [
    'x-pack/plugins/observability_solution/observability/public/header_actions.tsx',
    'xpack.observability',
  ],
  [
    'x-pack/plugins/observability_solution/apm/common/components/app/correlations/correlations_table.tsx',
    'xpack.apm',
  ],
  ['x-pack/plugins/cases/server/components/foo.tsx', 'xpack.cases'],
  [
    'x-pack/plugins/observability_solution/synthetics/public/apps/synthetics/components/alerts/toggle_alert_flyout_button.tsx',
    'xpack.synthetics',
  ],
  ['src/plugins/vis_types/gauge/public/editor/collections.ts', 'visTypeGauge'],
  ['packages/kbn-alerts-ui-shared/src/alert_lifecycle_status_badge/index.tsx', 'alertsUIShared'],
];

describe('Get i18n Identifier for file', () => {
  test.each(testMap)(
    'should get the right i18n identifier for a file inside a Kibana plugin',
    (path, expectedValue) => {
      const appName = getI18nIdentifierFromFilePath(`${SYSTEMPATH}/${path}`, SYSTEMPATH);
      expect(appName).toBe(expectedValue);
    }
  );
});
