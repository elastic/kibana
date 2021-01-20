/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export function tooltipFormatter(metricTitle, metricFormat, feature) {
  if (!feature) {
    return '';
  }

  return [
    {
      label: metricTitle,
      value: metricFormat(feature.properties.value),
    },
    {
      label: i18n.translate('tileMap.tooltipFormatter.latitudeLabel', {
        defaultMessage: 'Latitude',
      }),
      value: feature.geometry.coordinates[1],
    },
    {
      label: i18n.translate('tileMap.tooltipFormatter.longitudeLabel', {
        defaultMessage: 'Longitude',
      }),
      value: feature.geometry.coordinates[0],
    },
  ];
}
