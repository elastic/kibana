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

export function BoundToConfigObjProvider(config) {
  /**
   * Create an object with properties that may be bound to config values.
   * The input object is basically cloned unless one of it's own properties
   * resolved to a string value that starts with an equal sign. When that is
   * found, that property is forever bound to the corresponding config key.
   *
   * example:
   *
   * // name is cloned, height is bound to the defaultHeight config key
   * { name: 'john', height: '=defaultHeight' };
   *
   * @param  {Object} input
   * @return {Object}
   */
  function BoundToConfigObj(input) {
    const self = this;

    _.forOwn(input, function(value, prop) {
      if (!_.isString(value) || value.charAt(0) !== '=') {
        self[prop] = value;
        return;
      }

      const configKey = value.substr(1);

      config.watch(configKey, function update(value) {
        self[prop] = value;
      });
    });
  }

  return BoundToConfigObj;
}
