/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as usng from 'usng.js';
import { i18n } from '@kbn/i18n';
// @ts-ignore
export const converter = new usng.Converter();

export function withinRange(value: string | number, min: number, max: number) {
  // @ts-expect-error upgrade typescript v5.1.6
  const isInvalid = value === '' || value > max || value < min;
  const error = isInvalid
    ? i18n.translate('fieldFormats.geoUtils.outOfRangeErrorMsg', {
        defaultMessage: `Must be between {min} and {max}`,
        values: { min, max },
      })
    : null;
  return { isInvalid, error };
}

export function ddToUTM(lat: number, lon: number) {
  try {
    const utm = converter.LLtoUTM(lat, lon);
    return {
      northing: utm === converter.UNDEFINED_STR ? '' : String(Math.round(utm.northing)),
      easting: utm === converter.UNDEFINED_STR ? '' : String(Math.round(utm.easting)),
      zone:
        utm === converter.UNDEFINED_STR
          ? ''
          : `${utm.zoneNumber}${converter.UTMLetterDesignator(lat)}`,
    };
  } catch (e) {
    return {
      northing: '',
      easting: '',
      zone: '',
    };
  }
}

export function utmToDD(northing: string, easting: string, zoneNumber: string) {
  try {
    return converter.UTMtoLL(northing, easting, zoneNumber);
  } catch (e) {
    return undefined;
  }
}

export function ddToDMS(lat: number, lon: number) {
  const southing = lat < 0;
  const westing = lon < 0;
  lat = Math.abs(lat);
  const lathours = parseInt(lat.toString(), 10).toString();
  const latmins = parseInt(((lat % 1) * 60).toString(), 10).toString();
  const latsec = parseInt(((((lat % 1) * 60) % 1) * 60).toString(), 10).toString();
  const lats =
    lathours.padStart(2, '0') +
    latmins.padStart(2, '0') +
    latsec.padStart(2, '0') +
    (southing ? 'S' : 'N');
  lon = Math.abs(lon);
  const lonhours = parseInt(lon.toString(), 10).toString();
  const lonmins = parseInt(((lon % 1) * 60).toString(), 10).toString();
  const lonsec = parseInt(((((lon % 1) * 60) % 1) * 60).toString(), 10).toString();
  const lons =
    lonhours.padStart(3, '0') +
    lonmins.padStart(2, '0') +
    lonsec.padStart(2, '0') +
    (westing ? 'W' : 'E');
  return `${lats},${lons}`;
}

export function ddToMGRS(lat: number, lon: number) {
  try {
    const mgrsCoord = converter.LLtoMGRS(lat, lon, 5);
    return mgrsCoord;
  } catch (e) {
    return '';
  }
}

export function mgrstoUSNG(mgrs: string) {
  let squareIdEastSpace = 0;
  for (let i = mgrs.length - 1; i > -1; i--) {
    // check if we have hit letters yet
    if (isNaN(parseInt(mgrs.substr(i, 1), 10))) {
      squareIdEastSpace = i + 1;
      break;
    }
  }
  const gridZoneSquareIdSpace = squareIdEastSpace ? squareIdEastSpace - 2 : -1;
  const numPartLength = mgrs.substr(squareIdEastSpace).length / 2;
  // add the number split space
  const eastNorthSpace = squareIdEastSpace ? squareIdEastSpace + numPartLength : -1;
  const stringArray = mgrs.split('');

  stringArray.splice(eastNorthSpace, 0, ' ');
  stringArray.splice(squareIdEastSpace, 0, ' ');
  stringArray.splice(gridZoneSquareIdSpace, 0, ' ');

  const rejoinedArray = stringArray.join('');
  return rejoinedArray;
}

export function mgrsToDD(mgrs: string) {
  try {
    return converter.USNGtoLL(mgrstoUSNG(mgrs));
  } catch (e) {
    return undefined;
  }
}
