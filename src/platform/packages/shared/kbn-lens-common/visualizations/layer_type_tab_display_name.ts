/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import type { LensLayerType } from './types';

// Mapping of lens layer types to tab display names
export const lensLayerTypeTabDisplayNames = {
  data: i18n.translate('xpack.lens.layerTypes.tabDisplayName.data', {
    defaultMessage: 'Data layer',
  }),
  referenceLine: i18n.translate('xpack.lens.layerTypes.tabDisplayName.referenceLine', {
    defaultMessage: 'Reference line',
  }),
  annotations: i18n.translate('xpack.lens.layerTypes.tabDisplayName.annotations', {
    defaultMessage: 'Annotation',
  }),
  metricTrendline: i18n.translate('xpack.lens.layerTypes.tabDisplayName.metricTrendline', {
    defaultMessage: 'Metric trendline',
  }),
  unknown: i18n.translate('xpack.lens.layerTypes.tabDisplayName.unknown', {
    defaultMessage: 'Unknown layer',
  }),
} as const;

// Utility function to get the tab display name for a layer type
export function getLensLayerTypeTabDisplayName(
  layerType?: LensLayerType,
  layerTypeCount?: number,
  countForLayerId?: number
): string {
  const baseLabel =
    (layerType && lensLayerTypeTabDisplayNames[layerType]) ?? lensLayerTypeTabDisplayNames.unknown;

  return i18n.translate('xpack.lens.layerTypes.tabDisplayName.withCount', {
    defaultMessage: '{baseLabel}{displayCount, select, true { {countForLayerId}} other {}}',
    values: {
      baseLabel,
      displayCount: (layerTypeCount ?? 0) > 1,
      countForLayerId,
    },
  });
}
