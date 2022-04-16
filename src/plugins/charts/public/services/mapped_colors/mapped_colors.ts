/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import Color from 'color';

import { CoreSetup } from '@kbn/core/public';

import { COLOR_MAPPING_SETTING } from '../../../common';
import { createColorPalette } from '../../static/colors';

const standardizeColor = (color: string) => new Color(color).hex().toLowerCase();

/**
 * Maintains a lookup table that associates the value (key) with a hex color (value)
 * across the visualizations.
 * Provides functions to interact with the lookup table
 */
export class MappedColors {
  private _oldMap: any;
  private _mapping: any;

  constructor(
    private uiSettings?: CoreSetup['uiSettings'],
    private colorPaletteFn: (num: number) => string[] = createColorPalette
  ) {
    this._oldMap = {};
    this._mapping = {};
  }

  private getConfigColorMapping(): Record<string, string> {
    return _.mapValues(this.uiSettings?.get(COLOR_MAPPING_SETTING) || {}, standardizeColor);
  }

  public get oldMap(): any {
    return this._oldMap;
  }

  public get mapping(): any {
    return this._mapping;
  }

  get(key: string | number) {
    return this.getConfigColorMapping()[key as any] || this._mapping[key];
  }

  getColorFromConfig(key: string | number) {
    return this.getConfigColorMapping()[key as any];
  }

  flush() {
    this._oldMap = _.clone(this._mapping);
    this._mapping = {};
  }

  purge() {
    this._oldMap = {};
    this._mapping = {};
  }

  mapKeys(keys: Array<string | number>) {
    const configMapping = this.getConfigColorMapping();
    const configColors = _.values(configMapping);
    const oldColors = _.values(this._oldMap);

    const keysToMap: Array<string | number> = [];
    _.each(keys, (key) => {
      // If this key is mapped in the config, it's unnecessary to have it mapped here
      if (configMapping[key as any]) delete this._mapping[key];

      // If this key is mapped to a color used by the config color mapping, we need to remap it
      if (_.includes(configColors, this._mapping[key])) keysToMap.push(key);

      // if key exist in oldMap, move it to mapping
      if (this._oldMap[key]) this._mapping[key] = this._oldMap[key];

      // If this key isn't mapped, we need to map it
      if (this.get(key) == null) keysToMap.push(key);
    });

    // Generate a color palette big enough that all new keys can have unique color values
    const allColors = _(this._mapping).values().union(configColors).union(oldColors).value();
    const colorPalette = this.colorPaletteFn(allColors.length + keysToMap.length);
    let newColors = _.difference(colorPalette, allColors);

    while (keysToMap.length > newColors.length) {
      newColors = newColors.concat(_.sampleSize(allColors, keysToMap.length - newColors.length));
    }

    _.merge(this._mapping, _.zipObject(keysToMap, newColors));
  }
}
