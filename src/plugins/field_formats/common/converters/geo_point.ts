/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Point } from 'geojson';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { FIELD_FORMAT_IDS } from '../types';
import { asPrettyString } from '../utils';

const TRANSFORM_OPTIONS = [
  {
    kind: 'none',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.none', {
      defaultMessage: '- None -',
    }),
  },
  {
    kind: 'string',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.string', {
      defaultMessage: 'lat,lon',
    }),
  },
  {
    kind: 'wkt',
    text: i18n.translate('fieldFormats.geoPoint.transformOptions.wkt', {
      defaultMessage: 'Well-Known Text',
    }),
  },
];

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

  textConvert: TextContextTypeConvert = (val: Point) => {
    if (!val || typeof val !== 'object') {
      return '';
    }

    if (typeof val !== 'object' || val.type !== 'Point' || val.coordinates?.length !== 2) {
      return asPrettyString(val);
    }

    switch (this.param('transform')) {
      case 'string':
        return `${val.coordinates[1]},${val.coordinates[0]}`;
      case 'wkt':
        return `POINT(${val.coordinates[0]},${val.coordinates[1]})`;
      default:
        return asPrettyString(val);
    }
  };
}
