/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Package } from '../types';

export const HARDCODED_MODULE_PATHS: Record<string, string> = {
  '@kbn/test-suites-src': 'src/platform/test',
};

type TransformFunction = (param: string) => string;
const TRANSFORMS: Record<string, string | TransformFunction> = {
  // misc path enhancements
  'x-pack/platform/packages/shared/observability/': 'x-pack/platform/packages/shared/',
  'src/platform/packages/shared/chart_expressions/common':
    'src/platform/packages/shared/chart-expressions-common',
  'x-pack/solutions/security/packages/security-solution/': 'x-pack/solutions/security/packages/',
  'x-pack/platform/plugins/shared/observability_ai_assistant':
    'x-pack/platform/plugins/shared/observability_ai_assistant',
  'x-pack/solutions/observability/plugins/observability_solution/':
    'x-pack/solutions/observability/plugins/',
  'x-pack/solutions/observability/packages/observability/observability_utils/observability_':
    'x-pack/solutions/observability/packages/',
  'x-pack/solutions/observability/packages/observability/':
    'x-pack/solutions/observability/packages/',
  'x-pack/platform/packages/shared/alerting_rule_utils':
    'x-pack/platform/packages/shared/alerting-rule-utils',
  'x-pack/platform/packages/shared/logs_overview': 'x-pack/platform/packages/shared/logs-overview',
  'x-pack/solutions/observability/packages/alert_details':
    'x-pack/solutions/observability/packages/alert-details',
  'x-pack/solutions/observability/packages/alerting_test_data':
    'x-pack/solutions/observability/packages/alerting-test-data',
  'x-pack/solutions/observability/packages/get_padded_alert_time_range_util':
    'x-pack/solutions/observability/packages/get-padded-alert-time-range-util',
  'x-pack/solutions/observability/packages/synthetics_test_data':
    'x-pack/solutions/observability/packages/synthetics-test-data',
  'x-pack/solutions/observability/packages/utils_browser':
    'x-pack/solutions/observability/packages/utils-browser',
  'x-pack/solutions/observability/packages/utils_common':
    'x-pack/solutions/observability/packages/utils-common',
  'x-pack/solutions/observability/packages/utils_server':
    'x-pack/solutions/observability/packages/utils-server',
  'x-pack/solutions/search/packages/shared_ui': 'x-pack/solutions/search/packages/shared-ui',
  'x-pack/solutions/security/packages/data_table': 'x-pack/solutions/security/packages/data-table',
  'x-pack/solutions/security/packages/distribution_bar':
    'x-pack/solutions/security/packages/distribution-bar',
  'x-pack/solutions/security/packages/ecs_data_quality_dashboard':
    'x-pack/solutions/security/packages/ecs-data-quality-dashboard',
  'x-pack/solutions/security/packages/side_nav': 'x-pack/solutions/security/packages/side-nav',
  'x-pack/solutions/observability/packages/observability_ai/observability_ai_common':
    'x-pack/solutions/observability/packages/observability-ai/observability-ai-common',
  'x-pack/solutions/observability/packages/observability_ai/observability_ai_server':
    'x-pack/solutions/observability/packages/observability-ai/observability-ai-server',
  'src/platform/packages/shared/response-ops/alerts_apis':
    'src/platform/packages/shared/response-ops/alerts-apis',
  'src/platform/packages/shared/response-ops/alerts_fields_browser':
    'src/platform/packages/shared/response-ops/alerts-fields-browser',
  'src/platform/packages/shared/response-ops/alerts_table':
    'src/platform/packages/shared/response-ops/alerts-table',

  // custom core package relocation
  'src/dev/packages/serverless/storybook/config': 'src/dev/packages/serverless-storybook-config',
  'src/dev/packages/kbn-management/storybook/config':
    'src/dev/packages/management-storybook-config',
  'src/core/packages/core/test-helpers/core-test-helpers-kbn-server':
    'src/dev/packages/core-test-helpers-kbn-server',
  'src/core/packages/core/test-helpers/core-test-helpers-model-versions':
    'src/dev/packages/core-test-helpers-model-versions',
  // 'src/dev/packages/kbn-': (path: string) =>
  //   path.replace('src/dev/packages/kbn-', 'src/dev/packages/'),
  'src/core/packages/core/': (path: string) => {
    const relativePath = path.split('src/core/packages/')[1];
    const relativeChunks = relativePath.split('/');
    const packageName = relativeChunks.pop();
    const unneededPrefix = relativeChunks.join('-') + '-';

    // strip the spare /core/ folder
    path = path.replace('src/core/packages/core/', 'src/core/packages/');

    if (packageName?.startsWith(unneededPrefix)) {
      return path.replace(unneededPrefix, '');
    } else {
      return path;
    }
  },
};

export const applyTransforms = (module: Package, path: string): string => {
  const transform = Object.entries(TRANSFORMS).find(([what]) => path.includes(what));
  if (!transform) {
    return path;
  } else {
    const [what, by] = transform;
    if (typeof by === 'function') {
      return by(path);
    } else if (typeof by === 'string') {
      return path.replace(what, by);
    } else {
      throw new Error('Invalid transform function', by);
    }
  }
};
