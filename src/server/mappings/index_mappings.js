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

import { cloneDeep, isPlainObject } from 'lodash';

import { formatListAsProse } from '../../utils';
import { getRootProperties, getRootType } from './lib';

const DEFAULT_INITIAL_DSL = {
  rootType: {
    type: 'object',
    properties: {},
  },
};

export class IndexMappings {
  constructor(initialDsl = DEFAULT_INITIAL_DSL, mappingExtensions = []) {
    this._dsl = cloneDeep(initialDsl);
    if (!isPlainObject(this._dsl)) {
      throw new TypeError('initial mapping must be an object');
    }

    // ensure that we have a properties object in the dsl
    // and that the dsl can be parsed with getRootProperties() and kin
    this._setProperties(getRootProperties(this._dsl) || {});

    // extend this._dsl with each extension (which currently come from uiExports.savedObjectMappings)
    mappingExtensions.forEach(({ properties, pluginId }) => {
      const rootProperties = getRootProperties(this._dsl);

      const conflicts = Object.keys(properties)
        .filter(key => rootProperties.hasOwnProperty(key));

      const illegal = Object.keys(properties)
        .filter(key => key.startsWith('_'));

      if (conflicts.length) {
        const props = formatListAsProse(conflicts);
        const owner = pluginId ? `registered by plugin ${pluginId} ` : '';
        throw new Error(
          `Mappings for ${props} ${owner}have already been defined`
        );
      }

      if (illegal.length) {
        const props = formatListAsProse(illegal);
        const owner = pluginId ? `registered by plugin ${pluginId} ` : '';
        throw new Error(
          `Property name${props.length > 1 ? 's' : ''} ${props} ${owner}are not allowed to start with an underscore (_)`
        );
      }

      this._setProperties({
        ...rootProperties,
        ...properties
      });
    });
  }

  getDsl() {
    return cloneDeep(this._dsl);
  }

  _setProperties(newProperties) {
    const rootType = getRootType(this._dsl);
    this._dsl = {
      ...this._dsl,
      [rootType]: {
        ...this._dsl[rootType],
        properties: newProperties
      }
    };
  }
}
