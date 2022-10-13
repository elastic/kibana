/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';

interface Point {
  lat: number;
  lon: number;
}

export type GeoPoint = Point | string | [number, number];

export type GeoPointOutput = ExpressionValueBoxed<'geo_point', { value: GeoPoint }>;

interface GeoPointArguments extends Partial<Point> {
  point?: Array<string | number>;
}

export type ExpressionFunctionGeoPoint = ExpressionFunctionDefinition<
  'geoPoint',
  null,
  GeoPointArguments,
  GeoPointOutput
>;

export const geoPointFunction: ExpressionFunctionGeoPoint = {
  name: 'geoPoint',
  type: 'geo_point',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.geoPoint.help', {
    defaultMessage: 'Create a geo point',
  }),
  args: {
    lat: {
      types: ['number'],
      help: i18n.translate('data.search.functions.geoPoint.lat.help', {
        defaultMessage: 'Specify the latitude',
      }),
    },
    lon: {
      types: ['number'],
      help: i18n.translate('data.search.functions.geoPoint.lon.help', {
        defaultMessage: 'Specify the longitude',
      }),
    },
    point: {
      aliases: ['_'],
      types: ['number', 'string'],
      multi: true,
      help: i18n.translate('data.search.functions.geoPoint.point.help', {
        defaultMessage:
          'Specify the point as a string with comma-separated coordinates or as two numeric values',
      }),
    },
  },

  fn(input, { lat, lon, point }): GeoPointOutput {
    if (lat != null && lon != null) {
      return {
        type: 'geo_point',
        value: { lat, lon },
      };
    }

    if (!point) {
      throw new Error(
        i18n.translate('data.search.functions.geoPoint.arguments.error', {
          defaultMessage: 'Either "lat" and "lon" or "point" parameters should be specified.',
        })
      );
    }

    const [value] = point;

    if (typeof value === 'string') {
      return {
        value,
        type: 'geo_point',
      };
    }

    if (point.length !== 2) {
      throw new Error(
        i18n.translate('data.search.functions.geoPoint.point.error', {
          defaultMessage: 'The point parameter should either be a string or two numeric values.',
        })
      );
    }

    return {
      type: 'geo_point',
      value: [...point] as [number, number],
    };
  },
};
