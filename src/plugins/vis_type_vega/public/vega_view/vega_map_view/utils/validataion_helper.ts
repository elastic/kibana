/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export function validateZoomSettings(
  mapConfig: {
    maxZoom: number;
    minZoom: number;
    zoom?: number;
  },
  limits: {
    maxZoom: number;
    minZoom: number;
  },
  onWarn: (message: any) => void
) {
  const DEFAULT_ZOOM = 3;

  let { maxZoom, minZoom, zoom = DEFAULT_ZOOM } = mapConfig;

  const validate = (
    name: string,
    value: number,
    defaultValue: number,
    min: number,
    max: number
  ) => {
    if (value === undefined) {
      value = defaultValue;
    } else if (value < min) {
      onWarn(
        i18n.translate('visTypeVega.mapView.resettingPropertyToMinValueWarningMessage', {
          defaultMessage: 'Resetting {name} to {min}',
          values: { name: `"${name}"`, min },
        })
      );
      value = min;
    } else if (value > max) {
      onWarn(
        i18n.translate('visTypeVega.mapView.resettingPropertyToMaxValueWarningMessage', {
          defaultMessage: 'Resetting {name} to {max}',
          values: { name: `"${name}"`, max },
        })
      );
      value = max;
    }
    return value;
  };

  minZoom = validate('minZoom', minZoom, limits.minZoom, limits.minZoom, limits.maxZoom);
  maxZoom = validate('maxZoom', maxZoom, limits.maxZoom, limits.minZoom, limits.maxZoom);

  if (minZoom > maxZoom) {
    onWarn(
      i18n.translate('visTypeVega.mapView.minZoomAndMaxZoomHaveBeenSwappedWarningMessage', {
        defaultMessage: '{minZoomPropertyName} and {maxZoomPropertyName} have been swapped',
        values: {
          minZoomPropertyName: '"minZoom"',
          maxZoomPropertyName: '"maxZoom"',
        },
      })
    );
    [minZoom, maxZoom] = [maxZoom, minZoom];
  }

  zoom = validate('zoom', zoom, DEFAULT_ZOOM, minZoom, maxZoom);

  return {
    zoom,
    minZoom,
    maxZoom,
  };
}
