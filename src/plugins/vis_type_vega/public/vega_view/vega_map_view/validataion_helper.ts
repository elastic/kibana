/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { VegaBaseView } from '../vega_base_view';

export function validateZoomSettings(
  mapConfig: {
    maxZoom: number;
    minZoom: number;
    zoom: number;
  },
  limitMinZ: number,
  limitMaxZ: number,
  onWarn: VegaBaseView['onWarn']
) {
  let { maxZoom, minZoom, zoom } = mapConfig;

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

  minZoom = validate('minZoom', minZoom, limitMinZ, limitMinZ, limitMaxZ);
  maxZoom = validate('maxZoom', maxZoom, limitMaxZ, limitMinZ, limitMaxZ);

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

  zoom = validate('zoom', zoom, 3, minZoom, maxZoom);

  return {
    zoom,
    minZoom,
    maxZoom,
  };
}
