/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CoverageOverviewRuleSource,
  CoverageOverviewRuleActivity,
} from './coverage_overview_route';

export const getCoverageOverviewFilterMock = () => ({
  search_term: 'test query',
  activity: [CoverageOverviewRuleActivity.Enabled],
  source: [CoverageOverviewRuleSource.Prebuilt],
});
