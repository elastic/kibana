/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Point } from 'geojson';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { FIELD_FORMAT_IDS, TextContextTypeConvert } from '../types';
import { asPrettyString, geoUtils } from '../utils';
const { ddToMGRS, ddToDMS } = geoUtils;
const TRANSFORM_OPTIONS = [
  {
    kind: 'none',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.none', {
      defaultMessage: '- None -',
    }),
  },
  {
    kind: 'lat_lon_string',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.latLonString', {
      defaultMessage: 'string with the format: "lat,lon"',
    }),
  },
  {
    kind: 'wkt',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.wkt', {
      defaultMessage: 'Well-Known Text',
    }),
  },
  {
    kind: 'dms',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.dms', {
      defaultMessage: 'Degrees Minutes Seconds',
    }),
  },
  {
    kind: 'mgrs',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.mgrs', {
      defaultMessage: 'Military Grid Reference System (MGRS)',
    }),
  },
  {
    kind: 'multi',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.multi', {
      defaultMessage: 'All formats',
    }),
  },
];

/*
 * Convert value to GeoJson point
 *
 * When value is read from fields API, its a GeoJSON Point geometry
 * When value is ready from source, its as provided during ingest which supports multiple formats
 */
function toPoint(val: Point | { lat: number; lon: number } | string): Point | null {
  let lat: number = NaN;
  let lon: number = NaN;

  if (typeof val === 'object' && 'lat' in val && 'lon' in val) {
    lat = val.lat;
    lon = val.lon;
  } else if (typeof val === 'string') {
    if (val.startsWith('POINT (')) {
      const pointArg = val.slice('POINT ('.length, val.length);
      const split = pointArg.split(' ');
      if (split.length === 2) {
        lat = parseFloat(split[1]);
        lon = parseFloat(split[0]);
      }
    } else if (val.includes(',')) {
      const split = val.split(',');
      lat = parseFloat(split[0]);
      lon = parseFloat(split[1]);
    }
  }

  return Number.isNaN(lat) || Number.isNaN(lon)
    ? null
    : {
        type: 'Point',
        coordinates: [lon, lat],
      };
}

function isPoint(val: Point | { lat: number; lon: number } | string): boolean {
  return (
    typeof val === 'object' &&
    'type' in val &&
    val.type === 'Point' &&
    'coordinates' in val &&
    val.coordinates.length === 2
  );
}

/** @public */
export class GeoPointFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.GEO_POINT;
  static title = i18n.translate('fieldFormats.geoPoint.title', {
    defaultMessage: 'Geo point',
  });
  static fieldType = [KBN_FIELD_TYPES.GEO_POINT];
  static transformOptions = TRANSFORM_OPTIONS;

  getParamDefaults() {
    return {
      transform: 'none',
    };
  }

  textConvert: TextContextTypeConvert = (
    val: Point | { lat: number; lon: number } | string,
    options
  ) => {
    if (!val) {
      return '';
    }

    const point: Point | null = isPoint(val) ? (val as Point) : toPoint(val);
    if (!point) {
      return asPrettyString(val, options);
    }

    switch (this.param('transform')) {
      case 'lat_lon_string':
        return `${point.coordinates[1]},${point.coordinates[0]}`;
      case 'wkt':
        return `POINT (${point.coordinates[0]} ${point.coordinates[1]})`;
      case 'dms':
        return `${ddToDMS(point.coordinates[1], point.coordinates[0])}`;
      case 'mgrs':
        return `${ddToMGRS(point.coordinates[1], point.coordinates[0])}`;
      case 'multi':
        return `Lat Lon: ${point.coordinates[1]},${point.coordinates[0]}
WKT: POINT (${point.coordinates[0]} ${point.coordinates[1]})
MGRS: ${ddToMGRS(point.coordinates[1], point.coordinates[0])}
DMS: ${ddToDMS(point.coordinates[1], point.coordinates[0])}`;
      default:
        return asPrettyString(val, options);
    }
  };
}
