/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

function validate(
  name: string,
  value: number,
  defaultValue: number,
  min: number,
  max: number,
  onWarn: (message: string) => void
) {
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
}

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

  minZoom = validate('minZoom', minZoom, limits.minZoom, limits.minZoom, limits.maxZoom, onWarn);
  maxZoom = validate('maxZoom', maxZoom, limits.maxZoom, limits.minZoom, limits.maxZoom, onWarn);

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

  zoom = validate('zoom', zoom, DEFAULT_ZOOM, minZoom, maxZoom, onWarn);

  return {
    zoom,
    minZoom,
    maxZoom,
  };
}
