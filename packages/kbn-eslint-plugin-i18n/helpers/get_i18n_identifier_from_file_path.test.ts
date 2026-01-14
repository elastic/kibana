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
    'x-pack/solutions/observability/plugins/observability_onboarding/public/application/app.tsx',
    'xpack.observability_onboarding',
  ],
  [
    'x-pack/solutions/observability/plugins/observability/public/header_actions.tsx',
    'xpack.observability',
  ],
  [
    'x-pack/solutions/observability/plugins/apm/common/components/app/correlations/correlations_table.tsx',
    'xpack.apm',
  ],
  ['x-pack/platform/plugins/shared/cases/server/components/foo.tsx', 'xpack.cases'],
  [
    'x-pack/solutions/observability/plugins/synthetics/public/apps/synthetics/components/alerts/toggle_alert_flyout_button.tsx',
    'xpack.synthetics',
  ],
  ['src/platform/plugins/private/vis_types/gauge/public/editor/collections.ts', 'visTypeGauge'],
  [
    'src/platform/packages/shared/kbn-alerts-ui-shared/src/alert_lifecycle_status_badge/index.tsx',
    'alertsUIShared',
  ],
  [
    'src/platform/packages/shared/kbn-unified-chart-section-viewer/src/components/flyout/metrics_insights_flyout.tsx',
    'metricsExperience',
  ],
  // Package in x-pack with src/ directory (entry in root .i18nrc.json with x-pack/ prefix)
  [
    'x-pack/solutions/observability/packages/alert-details/src/components/alert_active_time_range_annotation.tsx',
    'observabilityAlertDetails',
  ],
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
