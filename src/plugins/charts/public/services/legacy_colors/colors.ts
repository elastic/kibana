/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { CoreSetup } from '@kbn/core/public';

import { MappedColors } from '../mapped_colors';
import { seedColors } from '../../static/colors';

/**
 * Accepts an array of strings or numbers that are used to create a
 * a lookup table that associates the values (key) with a hex color (value).
 * Returns a function that accepts a value (i.e. a string or number)
 * and returns a hex color associated with that value.
 */
export class LegacyColorsService {
  private _mappedColors?: MappedColors;

  public readonly seedColors = seedColors;

  public get mappedColors() {
    if (!this._mappedColors) {
      throw new Error('ColorService not yet initialized');
    }

    return this._mappedColors;
  }

  init(uiSettings: CoreSetup['uiSettings']) {
    this._mappedColors = new MappedColors(uiSettings);
  }

  createColorLookupFunction(
    arrayOfStringsOrNumbers?: Array<string | number>,
    colorMapping: Partial<Record<string, string>> = {}
  ) {
    if (!Array.isArray(arrayOfStringsOrNumbers)) {
      throw new Error(
        `createColorLookupFunction expects an array but recived: ${typeof arrayOfStringsOrNumbers}`
      );
    }

    arrayOfStringsOrNumbers.forEach(function (val) {
      if (!_.isString(val) && !_.isNumber(val) && !_.isUndefined(val)) {
        throw new TypeError(
          'createColorLookupFunction expects an array of strings, numbers, or undefined values'
        );
      }
    });

    this.mappedColors.mapKeys(arrayOfStringsOrNumbers);

    return (value: string | number) => {
      return colorMapping[value] || this.mappedColors.get(value);
    };
  }
}
