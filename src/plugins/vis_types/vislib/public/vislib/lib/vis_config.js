/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Provides vislib configuration, throws error if invalid property is accessed without providing defaults
 */
import { set } from '@kbn/safer-lodash-set';
import _ from 'lodash';
import { vislibTypesConfig as visTypes } from './types';
import { Data } from './data';

const DEFAULT_VIS_CONFIG = {
  style: {
    margin: { top: 10, right: 3, bottom: 5, left: 3 },
  },
  categoryAxes: [],
  valueAxes: [],
  grid: {},
};

export class VisConfig {
  constructor(visConfigArgs, data, uiState, el, createColorLookupFunction) {
    this.data = new Data(data, uiState, createColorLookupFunction);

    const visType = visTypes[visConfigArgs.type];
    const typeDefaults = visType(visConfigArgs, this.data);
    this._values = _.defaultsDeep({ ...typeDefaults }, DEFAULT_VIS_CONFIG);
    this._values.el = el;
  }

  get(property, defaults) {
    if (_.has(this._values, property) || typeof defaults !== 'undefined') {
      return _.get(this._values, property, defaults);
    } else {
      throw new Error(`Accessing invalid config property: ${property}`);
    }
  }

  set(property, value) {
    return set(this._values, property, value);
  }
}
