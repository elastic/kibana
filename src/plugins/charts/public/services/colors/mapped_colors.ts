/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import d3 from 'd3';

import { CoreSetup } from 'kibana/public';

import { COLOR_MAPPING_SETTING } from '../../../common';
import { createColorPalette } from './color_palette';

const standardizeColor = (color: string) => d3.rgb(color).toString();

/**
 * Maintains a lookup table that associates the value (key) with a hex color (value)
 * across the visualizations.
 * Provides functions to interact with the lookup table
 */
export class MappedColors {
  private _oldMap: any;
  private _mapping: any;

  constructor(private uiSettings: CoreSetup['uiSettings']) {
    this._oldMap = {};
    this._mapping = {};
  }

  private getConfigColorMapping() {
    return _.mapValues(this.uiSettings.get(COLOR_MAPPING_SETTING), standardizeColor);
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
    const colorPalette = createColorPalette(allColors.length + keysToMap.length);
    let newColors = _.difference(colorPalette, allColors);

    while (keysToMap.length > newColors.length) {
      newColors = newColors.concat(_.sampleSize(allColors, keysToMap.length - newColors.length));
    }

    _.merge(this._mapping, _.zipObject(keysToMap, newColors));
  }
}
