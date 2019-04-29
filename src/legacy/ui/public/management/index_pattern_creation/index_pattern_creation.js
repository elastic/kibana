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

import { IndexPatternCreationConfigRegistry } from './index_pattern_creation_config_registry';

class IndexPatternCreation {
  constructor(registry, httpClient, type) {
    this._registry = registry;
    this._allTypes = this._registry.inOrder.map(Plugin => new Plugin({ httpClient }));
    this._setCurrentType(type);
  }

  _setCurrentType = (type) => {
    const index = type ? this._registry.inOrder.findIndex(Plugin => Plugin.key === type) : -1;
    this._currentType = index > -1 && this._allTypes[index] ? this._allTypes[index] : null;
  }

  getType = () => {
    return this._currentType || null;
  }

  getIndexPatternCreationOptions = async (urlHandler) => {
    const options = [];
    await Promise.all(this._allTypes.map(async type => {
      const option = type.getIndexPatternCreationOption ? await type.getIndexPatternCreationOption(urlHandler) : null;
      if(option) {
        options.push(option);
      }
    }));
    return options;
  }
}

export const IndexPatternCreationFactory = (Private, $http) => {
  return (type = 'default') => {
    const indexPatternCreationRegistry = Private(IndexPatternCreationConfigRegistry);
    const indexPatternCreationProvider = new IndexPatternCreation(indexPatternCreationRegistry, $http, type);
    return indexPatternCreationProvider;
  };
};
