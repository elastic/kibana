/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain, isNil, pick, snakeCase } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import { GeoPoint, GeoPointOutput } from './geo_point';

// The API Extractor is not handling encapsulated interfaces in union types properly.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GeoBox = {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

type GeoPoints =
  | {
      top_left: GeoPoint;
      bottom_right: GeoPoint;
    }
  | {
      top_right: GeoPoint;
      bottom_left: GeoPoint;
    };

// The API Extractor is not handling encapsulated interfaces in union types properly.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type WellKnownText = {
  wkt: string;
};

/** GeoBoundingBox Accepted Formats:
 *  Lat Lon As Properties:
 *  "top_left" : {
 *    "lat" : 40.73, "lon" : -74.1
 *  },
 *  "bottom_right" : {
 *    "lat" : 40.01,  "lon" : -71.12
 *  }
 *
 *  Lat Lon As Array:
 *  {
 *    "top_left" : [-74.1, 40.73],
 *    "bottom_right" : [-71.12, 40.01]
 *  }
 *
 *  Lat Lon As String:
 *  {
 *    "top_left" : "40.73, -74.1",
 *    "bottom_right" : "40.01, -71.12"
 *  }
 *
 *  Bounding Box as Well-Known Text (WKT):
 *  {
 *    "wkt" : "BBOX (-74.1, -71.12, 40.73, 40.01)"
 *  }
 *
 *  Geohash:
 *  {
 *    "top_right" : "dr5r9ydj2y73",
 *    "bottom_left" : "drj7teegpus6"
 *  }
 *
 *  Vertices:
 *  {
 *    "top" : 40.73,
 *    "left" : -74.1,
 *    "bottom" : 40.01,
 *    "right" : -71.12
 *  }
 *
 * **/
export type GeoBoundingBox = GeoBox | GeoPoints | WellKnownText;

export type GeoBoundingBoxOutput = ExpressionValueBoxed<'geo_bounding_box', GeoBoundingBox>;

type GeoPointsArguments =
  | {
      topLeft: GeoPointOutput;
      bottomRight: GeoPointOutput;
    }
  | {
      topRight: GeoPointOutput;
      bottomLeft: GeoPointOutput;
    };

type GeoBoundingBoxArguments = GeoBox | GeoPointsArguments | WellKnownText;

function isGeoBox(value: any): value is GeoBox {
  return value?.top != null && value?.left != null && value?.bottom != null && value?.right != null;
}

function isGeoPoints(value: any): value is GeoPointsArguments {
  return (
    (value?.topLeft != null && value?.bottomRight != null) ||
    (value?.topRight != null && value?.bottomLeft != null)
  );
}

function isWellKnownText(value: any): value is WellKnownText {
  return value?.wkt != null;
}

export type ExpressionFunctionGeoBoundingBox = ExpressionFunctionDefinition<
  'geoBoundingBox',
  null,
  GeoBoundingBoxArguments,
  GeoBoundingBoxOutput
>;

export const geoBoundingBoxFunction: ExpressionFunctionGeoBoundingBox = {
  name: 'geoBoundingBox',
  type: 'geo_bounding_box',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.geoBoundingBox.help', {
    defaultMessage: 'Create a geo bounding box',
  }),
  args: {
    top: {
      types: ['number'],
      help: i18n.translate('data.search.functions.geoBoundingBox.top.help', {
        defaultMessage: 'Specify the top coordinate',
      }),
    },
    left: {
      types: ['number'],
      help: i18n.translate('data.search.functions.geoBoundingBox.left.help', {
        defaultMessage: 'Specify the left coordinate',
      }),
    },
    bottom: {
      types: ['number'],
      help: i18n.translate('data.search.functions.geoBoundingBox.bottom.help', {
        defaultMessage: 'Specify the bottom coordinate',
      }),
    },
    right: {
      types: ['number'],
      help: i18n.translate('data.search.functions.geoBoundingBox.right.help', {
        defaultMessage: 'Specify the right coordinate',
      }),
    },
    wkt: {
      types: ['string'],
      help: i18n.translate('data.search.functions.geoBoundingBox.wkt.help', {
        defaultMessage: 'Specify the Well-Known Text (WKT)',
      }),
    },
    topLeft: {
      types: ['geo_point'],
      help: i18n.translate('data.search.functions.geoBoundingBox.top_left.help', {
        defaultMessage: 'Specify the top left corner',
      }),
    },
    bottomRight: {
      types: ['geo_point'],
      help: i18n.translate('data.search.functions.geoBoundingBox.bottom_right.help', {
        defaultMessage: 'Specify the bottom right corner',
      }),
    },
    topRight: {
      types: ['geo_point'],
      help: i18n.translate('data.search.functions.geoBoundingBox.top_right.help', {
        defaultMessage: 'Specify the top right corner',
      }),
    },
    bottomLeft: {
      types: ['geo_point'],
      help: i18n.translate('data.search.functions.geoBoundingBox.bottom_left.help', {
        defaultMessage: 'Specify the bottom left corner',
      }),
    },
  },

  fn(input, args): GeoBoundingBoxOutput {
    if (isWellKnownText(args)) {
      return {
        ...pick(args, 'wkt'),
        type: 'geo_bounding_box',
      };
    }

    if (isGeoBox(args)) {
      return {
        ...pick(args, ['top', 'left', 'bottom', 'right']),
        type: 'geo_bounding_box',
      };
    }

    if (isGeoPoints(args)) {
      return {
        ...(chain(args)
          .pick(['topLeft', 'bottomRight', 'topRight', 'bottomLeft'])
          .omitBy(isNil)
          .mapKeys((value, key) => snakeCase(key))
          .mapValues(({ value }) => value)
          .value() as unknown as GeoPoints),
        type: 'geo_bounding_box',
      };
    }

    throw new Error(
      i18n.translate('data.search.functions.geoBoundingBox.arguments.error', {
        defaultMessage:
          'At least one of the following groups of parameters must be provided: {parameters}.',
        values: {
          parameters: [
            ['wkt'],
            ['top', 'left', 'bottom', 'right'],
            ['topLeft', 'bottomRight'],
            ['topRight', 'bottomLeft'],
          ]
            .map((parameters) => parameters.join(', '))
            .join('; '),
        },
      })
    );
  },
};
