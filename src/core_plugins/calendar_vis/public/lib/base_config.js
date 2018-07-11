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

export class BaseConfig {
  constructor(configArgs) {
    this._values = _.cloneDeep(configArgs);
  }

  get(property, defaults) {
    let val;
    if (Array.isArray(property)) {
      val = [];
      property.forEach(p => {
        val = [...val, this._getProperty(p, defaults)];
      });
    }else {
      val = this._getProperty(property, defaults);
    }

    return val;
  }

  _getProperty(property, defaults) {
    if (_.has(this._values, property) || defaults !== void 0) {
      return _.get(this._values, property, defaults);
    } else {
      throw new Error(`Accessing invalid config property: ${property}`);
      return defaults;
    }
  }

  set(property, value) {
    return _.set(this._values, property, value);
  }

}
