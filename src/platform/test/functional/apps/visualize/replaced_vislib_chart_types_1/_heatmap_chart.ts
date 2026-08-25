/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { heatmapChartTests } from '../group2/_heatmap_chart';

// The same suite runs against the legacy vislib heatmap in group2.
export default function (context: FtrProviderContext) {
  heatmapChartTests(context, { isLegacyChart: false });
}
