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

import { IndexPatternCreationConfig } from './index_pattern_creation_config';
import { indexPatternTypes } from './index_pattern_types';

class IndexPatternCreation {
  private _allTypes: IndexPatternCreationConfig[];
  private _currentType: IndexPatternCreationConfig | null;

  constructor(httpClient: object, type: string) {
    this._allTypes = indexPatternTypes.map(Plugin => new Plugin({ httpClient }));
    this._currentType = null;
    this._setCurrentType(type);
  }

  _setCurrentType = (type: string) => {
    const index = type ? indexPatternTypes.findIndex(Plugin => Plugin.key === type) : -1;
    this._currentType = index > -1 && this._allTypes[index] ? this._allTypes[index] : null;
  };

  getType = () => {
    return this._currentType || null;
  };

  getIndexPatternCreationOptions = async (urlHandler: any) => {
    const options: any[] = [];
    await Promise.all(
      this._allTypes.map(async type => {
        const option = type.getIndexPatternCreationOption
          ? await type.getIndexPatternCreationOption(urlHandler)
          : null;
        if (option) {
          options.push(option);
        }
      })
    );
    return options;
  };
}

export const IndexPatternCreationFactory = (Private: any, $http: object) => {
  return (type = 'default') => {
    const indexPatternCreationProvider = new IndexPatternCreation($http, type);
    return indexPatternCreationProvider;
  };
};
