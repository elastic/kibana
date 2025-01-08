/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { createColorPalette } from '../../static/colors';

/**
 * Maintains a lookup table that associates the value (key) with a hex color (value)
 * across the visualizations.
 * Provides functions to interact with the lookup table
 */
export class MappedColors {
  private _mapping: any;

  constructor(private colorPaletteFn: (num: number) => string[] = createColorPalette) {
    this._mapping = {};
  }

  public get mapping(): any {
    return this._mapping;
  }

  get(key: string | number) {
    return this._mapping[key];
  }

  mapKeys(keys: Array<string | number>) {
    const keysToMap: Array<string | number> = [];
    _.each(keys, (key) => {
      // If this key isn't mapped, we need to map it
      if (this.get(key) == null) keysToMap.push(key);
    });

    // Generate a color palette big enough that all new keys can have unique color values
    const allColors = _(this._mapping).values().value();
    const colorPalette = this.colorPaletteFn(allColors.length + keysToMap.length);
    let newColors = _.difference(colorPalette, allColors);

    while (keysToMap.length > newColors.length) {
      newColors = newColors.concat(_.sampleSize(allColors, keysToMap.length - newColors.length));
    }

    _.merge(this._mapping, _.zipObject(keysToMap, newColors));
  }
}
